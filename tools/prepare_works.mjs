#!/usr/bin/env node
// tools/prepare_works.mjs —— 数据迁移准备：冻结 blue-fish 首批 id/slug 映射，给投稿与
// 站长自用清单补 slug 与 categoryIds。幂等、可重跑：已写入的 id / slug 一律保留，只补缺。
// 用法：node tools/prepare_works.mjs
//
// 口径（与 tools/generate_work_pages.mjs、合并契约一致）：
//   1. blue-fish 首批 ID 冻结映射（dist/blue-fish-ids.json）：
//      - 键 = raw 记录的 sourcePath；值 = { sourcePath, id, slug }。
//      - id = `sticker_bf_<raw 数组下标 i + 1，3 位补零>`（现行 id，不得重编号）。
//      - 文件已存在时，旧 id / slug 一律保留，只补缺（raw 清单被外部流程重新生成、
//        条目挪位或新增时，老条目的身份不变）。
//   2. slug = `<characterId 小写><YYYYMMDD><NNNN>`：收录日期 + 当日该角色 4 位序号。
//      序号域 = 三方并集（submissions + owner-picks + blue-fish 冻结映射全量 205 条）
//      按 createdAt 升序、同刻按 id 升序统一编；blue-fish 的 createdAt 固定
//      2026-09-15T00:00:00+08:00（都在 20260915 桶）。slug 由本脚本持久化，
//      其它组件只读不重算。
//   3. categoryIds 初分（先 id 后名字，已有不覆盖）：
//      id 以 sticker_op_ 开头 → ["illustration"]；name 含 立绘|设定|三视图 → ["setting"]；
//      其余 → ["meme"]。
//
// 首批 raw 清单不在本 worktree（dist/data/ 不进 git）：默认读维护者主工作树的
// dist/data/blue-fish-classification.json，可用环境变量 BLUE_FISH_RAW 覆盖，
// 本地若存在 dist/data/ 副本则兜底。
//
// 这个脚本是公开仓库的一部分：不写死凭据；下面的本机路径只是数据源兜底，可被覆盖。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DIST_DIR = path.join(REPO_ROOT, "dist");
const FROZEN_PATH = path.join(DIST_DIR, "blue-fish-ids.json");
const MANIFEST_PATHS = [
  path.join(DIST_DIR, "submissions", "works.json"),
  path.join(DIST_DIR, "owner-picks", "works.json")
];

// 首批 raw 清单的候选位置（前者优先）。
const BLUE_FISH_RAW_CANDIDATES = [
  process.env.BLUE_FISH_RAW,
  "E:/quick-site-studio/AI娘表情包/dist/data/blue-fish-classification.json",
  path.join(DIST_DIR, "data", "blue-fish-classification.json")
].filter(Boolean);

const BLUE_FISH_CREATED_AT = "2026-09-15T00:00:00+08:00"; // 首批统一收录时刻（20260915 桶）
const BLUE_FISH_ID_PREFIX = "sticker_bf_";

function log(message) {
  process.stdout.write(`[prepare] ${message}\n`);
}

function fail(message) {
  process.stderr.write(`[prepare] 错误：${message}\n`);
  process.exit(1);
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fail(`${label} 读不到或不是合法 JSON：${filePath}（${error.message}）`);
  }
}

// 写文件：内容没变就不落盘（幂等、可重跑，且不扰动 mtime）。
// 既有 JSON 清单沿用原文件的换行风格（当前为 CRLF），新文件统一 LF。
function writeFileIfChanged(filePath, content) {
  if (fs.existsSync(filePath)) {
    const current = fs.readFileSync(filePath, "utf8");
    if (current === content) return false;
  }
  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

// 序列化成 dist 里 works.json 的既有体例：2 空格缩进 + 原文件换行风格 + 结尾换行。
function serializeLikeManifest(records, originalText) {
  const eol = originalText.includes("\r\n") ? "\r\n" : "\n";
  return JSON.stringify(records, null, 2).replace(/\n/g, eol) + eol;
}

/* categoryIds 初分（口径 3）。tools/generate_work_pages.mjs 里同款一份——
   那边是给 blue-fish 归一记录用的，改规则两处一起改。 */
function classifyCategoryIds(record) {
  const id = String(record.id || "");
  const name = String(record.name || "");
  if (id.startsWith("sticker_op_")) return ["illustration"];
  if (/立绘|设定|三视图/.test(name)) return ["setting"];
  return ["meme"];
}

// 收录日期（YYYYMMDD）：取 createdAt 字符串的日期段，与详情页「收录时间」显示一致。
function dateBucket(createdAt) {
  const text = String(createdAt || "").slice(0, 10).replace(/-/g, "");
  if (!/^\d{8}$/.test(text)) {
    return fail(`createdAt 取不出收录日期：${JSON.stringify(createdAt)}`);
  }
  return text;
}

function timestampOf(createdAt) {
  const value = Date.parse(String(createdAt || ""));
  return Number.isFinite(value) ? value : fail(`createdAt 不是合法时间：${JSON.stringify(createdAt)}`);
}

function pad(n, width) {
  return String(n).padStart(width, "0");
}

function main() {
  // ---------- 读入 ----------
  const rawPath = BLUE_FISH_RAW_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (!rawPath) {
    return fail(
      `找不到首批 raw 清单，试过：${BLUE_FISH_RAW_CANDIDATES.join("、")}；可用 BLUE_FISH_RAW 指定`
    );
  }
  const rawRecords = readJson(rawPath, "首批 raw 清单");
  if (!Array.isArray(rawRecords)) return fail("首批 raw 清单顶层必须是数组");

  let frozen = {};
  if (fs.existsSync(FROZEN_PATH)) {
    const parsed = readJson(FROZEN_PATH, "冻结映射");
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return fail("dist/blue-fish-ids.json 顶层必须是对象（键为 sourcePath）");
    }
    frozen = parsed;
  }

  const manifestStates = MANIFEST_PATHS.map((filePath) => {
    const originalText = fs.readFileSync(filePath, "utf8");
    const records = JSON.parse(originalText);
    if (!Array.isArray(records)) return fail(`${filePath} 顶层必须是数组`);
    return { filePath, originalText, records };
  });

  // ---------- 口径 1：blue-fish 冻结映射（旧 id / slug 保留，只补缺） ----------
  const seenSourcePaths = new Set();
  const takenIds = new Set(
    Object.values(frozen)
      .map((entry) => String((entry && entry.id) || ""))
      .filter(Boolean)
  );

  let frozenKept = 0;
  let frozenAdded = 0;
  for (let i = 0; i < rawRecords.length; i += 1) {
    const sourcePath = String((rawRecords[i] && rawRecords[i].sourcePath) || "").trim();
    if (!sourcePath) return fail(`raw[${i}] 缺 sourcePath，冻结映射没法键控`);
    if (seenSourcePaths.has(sourcePath)) return fail(`raw 里 sourcePath 重复：${sourcePath}`);
    seenSourcePaths.add(sourcePath);

    let entry = frozen[sourcePath];
    if (entry && typeof entry === "object" && entry.id && entry.slug) {
      frozenKept += 1;
      continue; // 旧 id / slug 一律保留
    }
    if (entry == null || typeof entry !== "object") {
      entry = {};
      frozen[sourcePath] = entry;
      frozenAdded += 1;
    } else if (!entry.id || !entry.slug) {
      frozenAdded += 1; // 部分缺（不该发生）也按补缺处理
    }
    entry.sourcePath = sourcePath;
    if (!entry.id) {
      // 现行 id = raw 下标 + 1；若该号已被别的 sourcePath 占用（清单被重新生成后
      // 条目挪位），顺延取下一个空号——只补缺，不碰老条目。
      let n = i + 1;
      while (takenIds.has(`${BLUE_FISH_ID_PREFIX}${pad(n, 3)}`)) n += 1;
      entry.id = `${BLUE_FISH_ID_PREFIX}${pad(n, 3)}`;
      takenIds.add(entry.id);
    }
    // slug 留到统一编号阶段补
    if (!entry.slug) entry.slug = "";
  }

  // ---------- 口径 2：三方并集统一编 slug ----------
  // { key, id, characterId, createdAt, dateStr, slug(可已冻结) }
  const union = [];
  for (const state of manifestStates) {
    for (const record of state.records) {
      const id = String((record && record.id) || "").trim();
      if (!id) return fail(`${state.filePath} 有记录缺 id`);
      const characterId = String((record && record.characterId) || "").trim();
      if (!characterId) return fail(`记录 ${id} 缺 characterId`);
      union.push({
        key: id,
        id,
        characterId,
        createdAt: String(record.createdAt || ""),
        slug: String(record.slug || "").trim() // 已有不覆盖
      });
    }
  }
  for (const record of rawRecords) {
    const sourcePath = String(record.sourcePath).trim();
    const entry = frozen[sourcePath];
    union.push({
      key: sourcePath,
      id: String(entry.id),
      characterId: String(record.characterId || "").trim(),
      createdAt: BLUE_FISH_CREATED_AT,
      slug: String(entry.slug || "").trim(),
      frozenEntry: entry // 编完号把 slug 落回冻结映射
    });
  }

  // createdAt 升序、同刻按 id 升序（合并契约 §1）。
  union.sort((a, b) => timestampOf(a.createdAt) - timestampOf(b.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // 每（角色，日）桶 4 位顺序号；已冻结的 slug 先占坑，新号跳过已用 slug 防撞。
  const usedSlugs = new Set(union.map((entry) => entry.slug).filter(Boolean));
  const counters = new Map();
  let slugAssigned = 0;
  for (const entry of union) {
    if (entry.slug) continue;
    const bucket = `${String(entry.characterId).toLowerCase()}|${dateBucket(entry.createdAt)}`;
    let n = (counters.get(bucket) || 0) + 1;
    let slug = `${String(entry.characterId).toLowerCase()}${dateBucket(entry.createdAt)}${pad(n, 4)}`;
    while (usedSlugs.has(slug)) {
      n += 1;
      slug = `${String(entry.characterId).toLowerCase()}${dateBucket(entry.createdAt)}${pad(n, 4)}`;
    }
    counters.set(bucket, n);
    usedSlugs.add(slug);
    entry.slug = slug;
    if (entry.frozenEntry) entry.frozenEntry.slug = slug;
    slugAssigned += 1;
  }

  // 写回冻结映射（键序 = raw 顺序，缺的补上）。
  let frozenWritten = false;
  {
    const ordered = {};
    for (const record of rawRecords) {
      const sourcePath = String(record.sourcePath).trim();
      const entry = frozen[sourcePath];
      ordered[sourcePath] = { sourcePath, id: entry.id, slug: entry.slug };
    }
    // 老条目即使已不在 raw 里也保留（冻结原则）。
    for (const [sourcePath, entry] of Object.entries(frozen)) {
      if (!(sourcePath in ordered)) ordered[sourcePath] = entry;
    }
    frozenWritten = writeFileIfChanged(FROZEN_PATH, JSON.stringify(ordered, null, 2) + "\n");
  }

  // ---------- 口径 3：给两份清单补 slug 与 categoryIds（已有不覆盖） ----------
  const slugById = new Map(union.map((entry) => [entry.key, entry.slug]));
  let manifestWritten = 0;
  let manifestFieldsAdded = 0;
  for (const state of manifestStates) {
    for (const record of state.records) {
      if (!record.slug) {
        record.slug = slugById.get(record.id);
        manifestFieldsAdded += 1;
      }
      if (!Array.isArray(record.categoryIds) || record.categoryIds.length === 0) {
        record.categoryIds = classifyCategoryIds(record);
        manifestFieldsAdded += 1;
      }
    }
    const next = serializeLikeManifest(state.records, state.originalText);
    if (writeFileIfChanged(state.filePath, next)) manifestWritten += 1;
  }

  // ---------- 汇报 ----------
  log(`首批 raw 清单：${rawPath}（${rawRecords.length} 条）`);
  log(`冻结映射 dist/blue-fish-ids.json：保留 ${frozenKept} 条、补缺 ${frozenAdded} 条${frozenWritten ? "（已写盘）" : "（无变化）"}`);
  log(`slug 统一编号：并集 ${union.length} 条，本次新编 ${slugAssigned} 条`);
  for (const state of manifestStates) {
    log(`  ${path.relative(REPO_ROOT, state.filePath).replace(/\\/g, "/")}：${state.records.length} 条`);
  }
  log(`清单补字段 ${manifestFieldsAdded} 处，写盘 ${manifestWritten} 份`);
  const sample = union.filter((entry) => entry.slug).slice(0, 2).map((entry) => `${entry.id} → ${entry.slug}`);
  const last = union.filter((entry) => entry.slug).slice(-1).map((entry) => `${entry.id} → ${entry.slug}`);
  log(`slug 抽样：${sample.concat(last).join("、")}`);
}

main();
