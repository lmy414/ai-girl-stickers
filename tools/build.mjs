#!/usr/bin/env node
// tools/build.mjs —— 零依赖发布构建（Node 内置模块 only）
//
// 用法：
//   node tools/build.mjs                 # 默认输出 <仓库根>/.build/site
//   node tools/build.mjs --out <目录>     # 指定输出目录
//   node tools/build.mjs --out <目录> --force-clean
//                                        # 目标已存在且非空、又没带 .build-output
//                                        # 标记时，必须显式加 --force-clean 才清空；
//                                        # 危险路径（系统目录 / 主目录等）永远拒绝，
//                                        # --force-clean 也不能绕过。
//
// 行为契约（服务器侧发布脚本与本地自检都按这个契约来）：
//   1. 把 <仓库根>/dist 递归复制成一份发布产物；跳过 dist/data/ 与
//      dist/submissions/originals/（既不复制、也不创建空目录）。
//   2. 纯字节拷贝：不改写 JSON、不写时间戳、不访问网络、不修改原图、不跑压缩。
//      同一输入两次构建，文件集合与每个文件的 SHA-256 必须完全一致。
//   3. 复制后做断言，任一失败就删掉产物并非零退出：必需文件齐全、被排除目录
//      未混入、清单形状与 id 唯一、作品的 characterId / categoryIds 都能在清单里
//      解析到（引用完整性），以及投稿模板的角色下拉与产物里的 characters.json
//      一致（断言逻辑复用 tools/sync_issue_template.mjs）。
//
// 相对路径的 --out 按仓库根解析，且必须留在仓库根内（拒绝 `..` 穿越）。
// 绝对路径的 --out 允许指向仓库外（服务器发布把产物建在 git 工作树之外的
// staging 目录里），但仍要过下面的通用安全断言。
//
// 这个脚本是公开仓库的一部分：不写死域名、IP、凭据或服务器路径。

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkTemplateSync } from "./sync_issue_template.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DIST_DIR = path.join(REPO_ROOT, "dist");
const DEFAULT_OUT = path.join(REPO_ROOT, ".build", "site");

// 仓库里的投稿模板（不在产物里）。路径与 tools/sync_issue_template.mjs 的
// TEMPLATE_PATH 保持一致——「仓库根的 sticker-submission.yml」指的就是它。
const TEMPLATE_PATH = path.join(
  REPO_ROOT,
  ".github",
  "ISSUE_TEMPLATE",
  "sticker-submission.yml",
);

// 构建产物根上的标记文件：内容固定、无时间戳，保证两次构建逐字节一致。
// 下次运行时凭它识别「这确实是本脚本的产物」，才允许直接清空重建。
const MARKER_NAME = ".build-output";
const MARKER_CONTENT = "tools/build.mjs\n";

// 危险路径黑名单（自身）：即使带 --force-clean 也一律拒绝删除。
const UNIX_BANNED = [
  "/usr",
  "/bin",
  "/sbin",
  "/lib",
  "/lib64",
  "/libexec",
  "/etc",
  "/var",
  "/tmp",
  "/home",
  "/root",
  "/boot",
  "/dev",
  "/proc",
  "/sys",
  "/srv",
  "/opt",
  "/mnt",
  "/media",
  "/run",
];

// 构建产物必须排除的 dist 内相对目录（POSIX 风格）。
const SKIP_DIRS = ["data", "submissions/originals"];

// 产物必须存在且非空的文件（POSIX 风格相对路径）。
const REQUIRED_FILES = [
  "index.html",
  "app.js",
  "styles.css",
  "tokens.css",
  "robots.txt",
  "favicon.png",
  "avatar.png",
  "characters.json",
  "categories.json",
  "submissions/works.json",
  "owner-picks/works.json",
];

function log(message) {
  process.stdout.write(`[build] ${message}\n`);
}

function fail(message) {
  process.stderr.write(`[build] 错误：${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  let out = null;
  let forceClean = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--out") {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        fail("--out 后面必须跟一个目录路径");
      }
      out = value;
      i += 1;
    } else if (arg.startsWith("--out=")) {
      out = arg.slice("--out=".length);
    } else if (arg === "--force-clean") {
      forceClean = true;
    } else if (arg === "-h" || arg === "--help") {
      process.stdout.write(
        "用法：node tools/build.mjs [--out <目录>] [--force-clean]\n" +
          "  --out <目录>     输出目录，默认 <仓库根>/.build/site\n" +
          "  --force-clean    允许清空已存在、非空、且没有 .build-output 标记的目录\n",
      );
      process.exit(0);
    } else {
      fail(`无法识别的参数：${arg}`);
    }
  }
  return { out, forceClean };
}

// 把路径拆成非空片段，用于深度判断（跨平台）。
function segments(absPath) {
  return path
    .resolve(absPath)
    .split(/[\\/]+/)
    .filter((part) => part.length > 0);
}

function isInside(child, parent) {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function normalizeForCompare(p) {
  const resolved = path.resolve(p);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

// 危险路径判定：文件系统根、系统目录、Git 安装目录、用户主目录本身等。
// 这些一律拒绝删除，--force-clean 也不能绕过。
function isDangerousPath(absDir) {
  const resolved = path.resolve(absDir);
  const target = normalizeForCompare(resolved);
  const root = path.parse(resolved).root;

  // 文件系统根 / 盘符根。
  if (target === normalizeForCompare(root)) return true;

  // 在 Windows + Git Bash 下，MSYS 会把 /usr、/tmp 这类 POSIX 路径改写成
  // Git 安装目录下的对应子目录，所以同时比对「安装根 + 同名子目录」。
  const gitRoot = process.env.ProgramFiles
    ? path.join(process.env.ProgramFiles, "Git")
    : null;
  for (const dir of UNIX_BANNED) {
    const name = dir.replace(/^\/+/, "");
    const candidates = [dir, path.join(root, name)];
    if (gitRoot) candidates.push(path.join(gitRoot, name));
    if (candidates.some((candidate) => normalizeForCompare(candidate) === target)) {
      return true;
    }
  }

  // Windows 受保护目录与用户主目录「本身」。
  // os.tmpdir() 也必须在列：MSYS 会把 /tmp 改写成 Windows 真实临时目录，
  // 只比对字面 /tmp 会漏过，从而对用户临时目录发起递归删除。
  const protectedExact = [
    process.env.SystemRoot,
    process.env.ProgramFiles,
    process.env["ProgramFiles(x86)"],
    process.env.ProgramW6432,
    gitRoot,
    os.homedir(),
    os.tmpdir(),
  ];
  if (protectedExact.some((candidate) => candidate && normalizeForCompare(candidate) === target)) {
    return true;
  }

  // Windows 系统目录 / Git 安装目录「内部」同样视为危险。
  const protectedTrees = [process.env.SystemRoot, gitRoot].filter(Boolean);
  for (const tree of protectedTrees) {
    const treeAbs = path.resolve(tree);
    if (resolved !== treeAbs && isInside(resolved, treeAbs)) return true;
  }

  return false;
}

// 解析并校验输出目录。返回 { outAbs, existed }。
function resolveOut(outArg) {
  const raw = outArg === null || outArg === undefined ? "" : String(outArg).trim();
  if (raw === "") {
    fail("--out 不能为空");
  }

  const isAbsolute = path.isAbsolute(raw);
  const outAbs = isAbsolute ? path.resolve(raw) : path.resolve(REPO_ROOT, raw);

  if (!isAbsolute && !isInside(outAbs, REPO_ROOT)) {
    fail(`相对输出目录不允许逃出仓库根（.. 穿越）：${raw}`);
  }

  // 不允许是仓库根，也不允许是仓库根的祖先。
  if (outAbs === REPO_ROOT || isInside(REPO_ROOT, outAbs)) {
    fail(`输出目录不能是仓库根，也不能是仓库根的祖先：${outAbs}`);
  }

  // 也不允许落在仓库自己的 .git 里。
  if (isInside(outAbs, path.join(REPO_ROOT, ".git"))) {
    fail(`输出目录不能位于 .git 内：${outAbs}`);
  }

  // 不允许指向站点源目录 dist/ 本身（会用构建产物覆盖源码）。
  if (outAbs === DIST_DIR || isInside(outAbs, DIST_DIR)) {
    fail(`输出目录不能是站点源目录 dist/ 或它内部：${outAbs}`);
  }

  // 不允许是文件系统根 / 盘符根，路径深度至少两层。
  const parts = segments(outAbs);
  if (parts.length < 2) {
    fail(`输出目录路径太浅，拒绝操作：${outAbs}`);
  }

  return { outAbs };
}

// 删除一个已存在的目录，删除前再做一次「只删目标本身」的断言。
// 这是内部清理入口（含失败路径），不受 .build-output / --force-clean 约束，
// 但危险路径黑名单始终生效。
function removeDir(absDir) {
  if (!fs.existsSync(absDir)) return;
  const stat = fs.lstatSync(absDir);
  if (!stat.isDirectory()) {
    fail(`目标已存在且不是目录，拒绝删除：${absDir}`);
  }
  if (isDangerousPath(absDir)) {
    fail(`目标落在危险路径（系统目录 / 主目录等），拒绝删除：${absDir}`);
  }
  if (path.basename(absDir) === path.basename(REPO_ROOT)) {
    fail(`目标目录名与仓库根同名，拒绝删除：${absDir}`);
  }
  if (absDir === REPO_ROOT || isInside(REPO_ROOT, absDir)) {
    fail(`目标目录是仓库根或其祖先，拒绝删除：${absDir}`);
  }
  if (segments(absDir).length < 2) {
    fail(`目标目录路径太浅，拒绝删除：${absDir}`);
  }
  fs.rmSync(absDir, { recursive: true, force: true });
}

// 清空一个「已存在」的输出目录之前的前置检查：空目录放行；非空目录必须
// 自带 .build-output 标记，否则要显式 --force-clean。
function assertCleanable(absDir, forceClean) {
  const entries = fs.readdirSync(absDir);
  if (entries.length === 0) return;
  if (entries.includes(MARKER_NAME)) return;
  if (forceClean) {
    log(`--force-clean 生效：允许清空非构建产物目录 ${absDir}`);
    return;
  }
  fail(
    `输出目录已存在且非空，并且没有 ${MARKER_NAME} 标记，拒绝清空：${absDir}\n` +
      `  确认这是可以删除的目录后，加 --force-clean 重新运行；或换一个 --out 目录。`,
  );
}

function toPosix(relPath) {
  return relPath.split(path.sep).join("/");
}

// 递归复制，跳过 SKIP_DIRS。entries 排序保证确定性。
function copyTree(srcDir, destDir, relPrefix) {
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs
    .readdirSync(srcDir, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  for (const entry of entries) {
    const rel = relPrefix === "" ? entry.name : `${relPrefix}/${entry.name}`;
    if (SKIP_DIRS.includes(rel)) continue;

    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyTree(srcPath, destPath, rel);
      continue;
    }
    if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
      continue;
    }
    // 符号链接等：按目标类型处理（dist 里通常没有，保守兜底）。
    const target = fs.statSync(srcPath);
    if (target.isDirectory()) {
      copyTree(srcPath, destPath, rel);
    } else if (target.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    } else {
      throw new Error(`不支持的源条目类型：${srcPath}`);
    }
  }
}

function countFiles(rootDir) {
  let total = 0;
  const stack = [rootDir];
  while (stack.length > 0) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else total += 1;
    }
  }
  return total;
}

function readJsonArray(filePath) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${filePath} 不是合法 JSON：${error.message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${filePath} 顶层必须是数组`);
  }
  return parsed;
}

function requireAsset(outAbs, relPath, context) {
  if (typeof relPath !== "string" || relPath.trim() === "") {
    throw new Error(`${context} 为空`);
  }
  const normalized = relPath.replace(/^\/+/, "").split("/").join(path.sep);
  const target = path.resolve(outAbs, normalized);
  if (!isInside(target, outAbs) || target === path.resolve(outAbs)) {
    throw new Error(`${context} 引用的路径逃出产物目录：${relPath}`);
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    throw new Error(`${context} 引用的文件在产物里不存在：${relPath}`);
  }
}

function isExhibited(record) {
  return record && (record.status === undefined || record.status === "published");
}

// 校验清单（characters.json / categories.json）形状：条目是对象、id 与 name
// 是非空字符串、id 在各自清单内唯一。返回 id 集合供引用解析用。
function indexManifest(entries, label) {
  const ids = new Set();
  for (const entry of entries) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`${label} 的条目必须是对象`);
    }
    if (typeof entry.id !== "string" || entry.id.trim() === "") {
      throw new Error(`${label} 的条目 id 必须是非空字符串：${JSON.stringify(entry)}`);
    }
    if (typeof entry.name !== "string" || entry.name.trim() === "") {
      throw new Error(`${label} 条目 ${entry.id} 的 name 必须是非空字符串`);
    }
    if (ids.has(entry.id)) {
      throw new Error(`${label} 的 id 重复：${entry.id}`);
    }
    ids.add(entry.id);
  }
  return ids;
}

// 引用完整性：作品的 characterId / categoryIds 必须能在清单里解析到。
function assertReferences(record, source, characterIds, categoryIds) {
  if (typeof record.characterId !== "string" || !characterIds.has(record.characterId)) {
    throw new Error(
      `${source} 的 characterId 在 characters.json 里解析不到：${JSON.stringify(record.characterId)}`,
    );
  }
  if (record.categoryIds !== undefined) {
    if (!Array.isArray(record.categoryIds)) {
      throw new Error(`${source} 的 categoryIds 必须是数组：${JSON.stringify(record.categoryIds)}`);
    }
    for (const categoryId of record.categoryIds) {
      if (typeof categoryId !== "string" || !categoryIds.has(categoryId)) {
        throw new Error(
          `${source} 的 categoryId 在 categories.json 里解析不到：${JSON.stringify(categoryId)}`,
        );
      }
    }
  }
}

function validateOutput(outAbs) {
  for (const rel of REQUIRED_FILES) {
    const target = path.join(outAbs, ...rel.split("/"));
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      throw new Error(`必需文件缺失：${rel}`);
    }
    if (fs.statSync(target).size <= 0) {
      throw new Error(`必需文件为空：${rel}`);
    }
  }

  for (const rel of SKIP_DIRS) {
    if (fs.existsSync(path.join(outAbs, ...rel.split("/")))) {
      throw new Error(`产物里不应存在被排除的目录：${rel}`);
    }
  }

  const characters = readJsonArray(path.join(outAbs, "characters.json"));
  const categories = readJsonArray(path.join(outAbs, "categories.json"));
  const characterIds = indexManifest(characters, "characters.json");
  const categoryIds = indexManifest(categories, "categories.json");

  const submissions = readJsonArray(path.join(outAbs, "submissions", "works.json"));
  for (const record of submissions) {
    if (!isExhibited(record)) continue;
    requireAsset(outAbs, record.thumbnailPath, `submissions/${record.id}.thumbnailPath`);
    if (typeof record.fullPath === "string" && record.fullPath !== "") {
      requireAsset(outAbs, record.fullPath, `submissions/${record.id}.fullPath`);
    }
    assertReferences(record, `submissions/${record.id}`, characterIds, categoryIds);
  }

  const ownerPicks = readJsonArray(path.join(outAbs, "owner-picks", "works.json"));
  for (const record of ownerPicks) {
    if (!isExhibited(record)) continue;
    requireAsset(outAbs, record.thumbnailPath, `owner-picks/${record.id}.thumbnailPath`);
    if (typeof record.fullPath === "string" && record.fullPath !== "") {
      requireAsset(outAbs, record.fullPath, `owner-picks/${record.id}.fullPath`);
    }
    assertReferences(record, `owner-picks/${record.id}`, characterIds, categoryIds);
  }

  // 投稿模板一致性：用仓库根的模板文本对产物里的 characters.json 校验下拉。
  let yamlText;
  try {
    yamlText = fs.readFileSync(TEMPLATE_PATH, "utf8");
  } catch (error) {
    throw new Error(`读不到投稿模板 ${TEMPLATE_PATH}：${error.message}`);
  }
  const sync = checkTemplateSync({ characters, yamlText });
  if (!sync.ok) {
    throw new Error(
      `模板下拉与角色清单不一致，跑 node tools/sync_issue_template.mjs --write\n${sync.message}`,
    );
  }

  const published = submissions.filter((record) => record.status === "published").length;
  return {
    fileCount: countFiles(outAbs),
    submissionCount: submissions.length,
    submissionPublished: published,
    ownerPickCount: ownerPicks.length,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { outAbs } = resolveOut(args.out);

  if (!fs.existsSync(DIST_DIR) || !fs.statSync(DIST_DIR).isDirectory()) {
    fail(`找不到站点源目录：${DIST_DIR}`);
  }

  if (fs.existsSync(outAbs)) {
    // 危险路径优先于 .build-output / --force-clean 判定：系统目录、主目录、
    // 临时目录「本身」一律先拒绝，且提示统一为危险路径。
    if (isDangerousPath(outAbs)) {
      fail(`目标落在危险路径（系统目录 / 主目录 / 临时目录等），拒绝删除：${outAbs}`);
    }
    assertCleanable(outAbs, args.forceClean);
    log(`输出目录已存在，先删除目标目录本身：${outAbs}`);
    removeDir(outAbs);
  }

  log(`源目录：${DIST_DIR}`);
  log(`输出目录：${outAbs}`);
  log(`跳过目录：${SKIP_DIRS.join(", ")}`);

  try {
    copyTree(DIST_DIR, outAbs, "");
  } catch (error) {
    removeDir(outAbs);
    fail(`复制失败：${error.message}`);
  }

  let summary;
  try {
    summary = validateOutput(outAbs);
  } catch (error) {
    removeDir(outAbs);
    fail(`产物校验失败：${error.message}`);
  }

  // 校验全部通过之后才写下标记：下次运行据此识别这是本脚本的构建产物。
  try {
    fs.writeFileSync(path.join(outAbs, MARKER_NAME), MARKER_CONTENT);
  } catch (error) {
    removeDir(outAbs);
    fail(`写入构建标记失败：${error.message}`);
  }
  summary.fileCount = countFiles(outAbs);

  log("构建完成");
  log(`输出目录：${outAbs}`);
  log(`文件总数：${summary.fileCount}（含标记 ${MARKER_NAME}）`);
  log(`投稿记录数：${summary.submissionCount}（其中 published ${summary.submissionPublished}）`);
  log(`owner-picks 记录数：${summary.ownerPickCount}`);
  log(`已跳过：${SKIP_DIRS.join(", ")}`);
}

main();
