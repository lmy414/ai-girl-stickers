#!/usr/bin/env node
// tools/sync_issue_template.mjs —— 投稿模板「角色」下拉与角色清单同步（Node 内置模块 only）
//
// 用法：
//   node tools/sync_issue_template.mjs            # 默认 --check
//   node tools/sync_issue_template.mjs --check    # 只校验，不写文件
//   node tools/sync_issue_template.mjs --write    # 把下拉写回模板，写完再自检一遍
//
// 行为契约（tools/build.mjs 也按这个契约复用本脚本的导出）：
//   1. 角色清单 = <仓库根>/dist/characters.json（顶层数组）；模板 = 仓库里的投稿模板
//      .github/ISSUE_TEMPLATE/sticker-submission.yml。仓库根 = 本脚本所在目录的上一级。
//   2. 期望下拉行 = 清单里 inSubmissionForm === true 的条目**按清单顺序**输出，
//      8 空格缩进，格式精确为：
//        `        - "${name}（${id}${aliases.length ? " · 别名 " + aliases.join(" / ") : ""}）"`
//      别名非空时插 ` · 别名 `，别名之间用 ` / ` 连接；别名为空则括号里只剩 id
//      （如 `        - "其他角色（other）"`）。全角括号、` · 别名 `、` / ` 都是格式的一部分。
//   3. 只替换 `id: character` 那个 `dropdown` 块里 `options:` 之后连续的 `- "..."` 选项行，
//      文件其余部分逐字节不动（含 CRLF / LF 换行风格、结尾有无换行）。定位走行级解析：
//      按 `- type: dropdown` / `id: character` / `options:` 的缩进结构逐行找，
//      不用覆盖全文件的大正则。
//   4. --check：一致 → 打印一句说明、退出 0；不一致 → 打印期望与实际的差异、退出 1。
//      --write：写回后从磁盘重读再自检一遍，自检不过同样退出 1。
//   5. 导出 expectedOptionLines(characters) 与 checkTemplateSync({ characters, yamlText })
//      供 tools/build.mjs 复用；仅当作为 CLI 直接运行时才执行 main——用 import.meta.url
//      与 process.argv[1] 解析路径后归一化比较（斜杠统一、Windows 下忽略大小写）。
//   6. 只用 Node 内置模块；不联网、不改模板以外的任何文件。
//
// 这个脚本是公开仓库的一部分：不写死域名、IP、凭据或服务器路径。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const CHARACTERS_PATH = path.join(REPO_ROOT, "dist", "characters.json");
const TEMPLATE_PATH = path.join(
  REPO_ROOT,
  ".github",
  "ISSUE_TEMPLATE",
  "sticker-submission.yml",
);

function fail(message) {
  process.stderr.write(`[sync] 错误：${message}\n`);
  process.exit(1);
}

// 把路径归一化成可比较的形式：斜杠统一，Windows 下忽略大小写。
function normalizeFsPath(p) {
  const resolved = path.resolve(p);
  const folded = process.platform === "win32" ? resolved.toLowerCase() : resolved;
  return folded.split("\\").join("/");
}

// 只有「直接跑这个文件」时才执行 main；被 import（如 tools/build.mjs）时不执行。
function isCliEntry() {
  const entry = process.argv[1];
  if (typeof entry !== "string" || entry === "") return false;
  return normalizeFsPath(fileURLToPath(import.meta.url)) === normalizeFsPath(entry);
}

// 行级拆分：每行保留「内容 + 原换行符」，joinLines() 后逐字节还原。
function splitLines(text) {
  const lines = [];
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch !== "\n" && ch !== "\r") continue;
    const eolLength = ch === "\r" && text[i + 1] === "\n" ? 2 : 1;
    lines.push({ text: text.slice(start, i), eol: text.slice(i, i + eolLength) });
    i += eolLength - 1;
    start = i + 1;
  }
  if (start < text.length) {
    lines.push({ text: text.slice(start), eol: "" });
  }
  return lines;
}

function joinLines(lines) {
  return lines.map((line) => line.text + line.eol).join("");
}

function indentWidth(line) {
  const match = line.match(/^ */);
  return match ? match[0].length : 0;
}

// 行级定位：找 `id: character` 的那个 dropdown 块，返回它的 options: 行下标
// 与紧随其后的选项行闭区间 [runStart..runEnd]（runEnd < runStart 表示选项区为空）。
// 找不到这样的块返回 null。
function findCharacterOptionsBlock(lines) {
  // body 列表项起点：`- type: dropdown`（缩进结构里的项首行）。
  const itemStarts = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (/^\s*- type:\s*["']?dropdown["']?\s*$/.test(lines[i].text)) {
      itemStarts.push(i);
    }
  }

  for (let s = 0; s < itemStarts.length; s += 1) {
    const from = itemStarts[s];
    const to = s + 1 < itemStarts.length ? itemStarts[s + 1] : lines.length;

    // 项内必须有 `id: character`（精确匹配，不误伤 `id: character-extra`）。
    let idIndent = -1;
    for (let i = from + 1; i < to; i += 1) {
      if (/^\s*id:\s*["']?character["']?\s*$/.test(lines[i].text)) {
        idIndent = indentWidth(lines[i].text);
        break;
      }
    }
    if (idIndent < 0) continue;

    // 项内缩进比 id 更深的 `options:`，其后连续的列表项行即选项区。
    for (let i = from + 1; i < to; i += 1) {
      const text = lines[i].text;
      if (!/^\s*options:\s*$/.test(text)) continue;
      const optionsIndent = indentWidth(text);
      if (optionsIndent <= idIndent) continue;

      let end = i; // 空选项区：end < runStart
      for (let j = i + 1; j < to; j += 1) {
        const optionText = lines[j].text;
        const trimmed = optionText.trim();
        if (trimmed === "" || indentWidth(optionText) <= optionsIndent) break;
        if (trimmed !== "-" && !trimmed.startsWith("- ")) break;
        end = j;
      }
      return { optionsIndex: i, runStart: i + 1, runEnd: end };
    }
  }
  return null;
}

function renderLineList(list) {
  if (list.length === 0) return "  （空）";
  return list.map((line) => `  ${line}`).join("\n");
}

function diffText(expected, actual, firstDiff) {
  const parts = [
    `下拉行不一致：期望 ${expected.length} 行，实际 ${actual.length} 行`,
  ];
  if (firstDiff >= 0) parts.push(`首个差异在第 ${firstDiff + 1} 行`);
  parts.push("期望（按 dist/characters.json 生成）：", renderLineList(expected));
  parts.push("实际（模板现状）：", renderLineList(actual));
  return parts.join("\n");
}

// 由角色清单生成期望的下拉行（含 8 空格缩进，不含换行符）。
export function expectedOptionLines(characters) {
  if (!Array.isArray(characters)) {
    throw new TypeError("expectedOptionLines：characters 必须是数组");
  }
  return characters
    .filter((entry) => entry && entry.inSubmissionForm === true)
    .map((entry) => {
      const aliases = Array.isArray(entry.aliases) ? entry.aliases : [];
      const aliasPart = aliases.length > 0 ? ` · 别名 ${aliases.join(" / ")}` : "";
      return `        - "${entry.name}（${entry.id}${aliasPart}）"`;
    });
}

// 校验模板下拉与角色清单是否一致。返回 { ok, message }；message 可直接打印。
export function checkTemplateSync({ characters, yamlText }) {
  if (!Array.isArray(characters)) {
    return { ok: false, message: "characters 不是数组，无法校验模板下拉" };
  }
  if (typeof yamlText !== "string") {
    return { ok: false, message: "模板文本不是字符串，无法校验模板下拉" };
  }

  const expected = expectedOptionLines(characters);
  const lines = splitLines(yamlText);
  const block = findCharacterOptionsBlock(lines);
  if (block === null) {
    return {
      ok: false,
      message: "在模板里找不到 id: character 的 dropdown 块（或它没有 options: 行），无法校验",
    };
  }

  const actual = [];
  for (let i = block.runStart; i <= block.runEnd; i += 1) {
    actual.push(lines[i].text);
  }

  let firstDiff = -1;
  const total = Math.max(expected.length, actual.length);
  for (let i = 0; i < total; i += 1) {
    if (actual[i] !== expected[i]) {
      firstDiff = i;
      break;
    }
  }
  if (firstDiff === -1) {
    return { ok: true, message: `模板下拉与角色清单一致（${expected.length} 行）` };
  }
  return { ok: false, message: diffText(expected, actual, firstDiff) };
}

// 把期望下拉行写回模板：只动选项区，其余行（含各自换行符）原样保留。
// 返回 { ok, changed, message }。
function writeTemplate(yamlText, characters) {
  const lines = splitLines(yamlText);
  const block = findCharacterOptionsBlock(lines);
  if (block === null) {
    return {
      ok: false,
      changed: false,
      message: "在模板里找不到 id: character 的 dropdown 块（或它没有 options: 行），拒绝写入",
    };
  }

  const expected = expectedOptionLines(characters);
  const fallbackEol = lines[block.optionsIndex].eol || "\n";
  const newRun = expected.map((text, index) => {
    const old = lines[block.runStart + index];
    return { text, eol: old !== undefined && old.eol !== "" ? old.eol : fallbackEol };
  });
  const nextText = joinLines([
    ...lines.slice(0, block.runStart),
    ...newRun,
    ...lines.slice(block.runEnd + 1),
  ]);

  fs.writeFileSync(TEMPLATE_PATH, nextText, "utf8");
  return { ok: true, changed: nextText !== yamlText, message: "" };
}

function readCharacters() {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(CHARACTERS_PATH, "utf8"));
  } catch (error) {
    fail(`读不到或解析不了角色清单 ${CHARACTERS_PATH}：${error.message}`);
  }
  if (!Array.isArray(parsed)) {
    fail(`角色清单顶层必须是数组：${CHARACTERS_PATH}`);
  }
  return parsed;
}

function parseArgs(argv) {
  let mode = null;
  for (const arg of argv) {
    if (arg === "--check" || arg === "--write") {
      const next = arg.slice(2);
      if (mode !== null && mode !== next) {
        fail("--check 与 --write 不能同时给");
      }
      mode = next;
    } else if (arg === "-h" || arg === "--help") {
      process.stdout.write(
        "用法：node tools/sync_issue_template.mjs [--check|--write]\n" +
          "  --check   校验投稿模板的角色下拉与 dist/characters.json 一致（默认）\n" +
          "  --write   把期望下拉写回模板，写完再自检一遍\n",
      );
      process.exit(0);
    } else {
      fail(`无法识别的参数：${arg}`);
    }
  }
  return mode === null ? "check" : mode;
}

function main() {
  const mode = parseArgs(process.argv.slice(2));
  const characters = readCharacters();

  let yamlText;
  try {
    yamlText = fs.readFileSync(TEMPLATE_PATH, "utf8");
  } catch (error) {
    fail(`读不到投稿模板 ${TEMPLATE_PATH}：${error.message}`);
  }

  if (mode === "check") {
    const result = checkTemplateSync({ characters, yamlText });
    if (result.ok) {
      process.stdout.write(`[sync] ${result.message}\n`);
      return;
    }
    process.stderr.write(
      `[sync] 模板下拉与角色清单不一致，跑 node tools/sync_issue_template.mjs --write\n` +
        `${result.message}\n`,
    );
    process.exit(1);
  }

  const outcome = writeTemplate(yamlText, characters);
  if (!outcome.ok) {
    process.stderr.write(`[sync] ${outcome.message}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `[sync] 已写入 ${path.relative(REPO_ROOT, TEMPLATE_PATH).split(path.sep).join("/")}` +
      `（下拉 ${expectedOptionLines(characters).length} 行，内容${outcome.changed ? "有" : "无"}变化）\n`,
  );

  // 写回后自检：从磁盘重读，确认落盘结果与清单一致。
  const after = checkTemplateSync({
    characters,
    yamlText: fs.readFileSync(TEMPLATE_PATH, "utf8"),
  });
  if (!after.ok) {
    process.stderr.write(`[sync] 写回后自检失败：\n${after.message}\n`);
    process.exit(1);
  }
  process.stdout.write(`[sync] 写回后自检：${after.message}\n`);
}

if (isCliEntry()) {
  main();
}
