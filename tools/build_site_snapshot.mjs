#!/usr/bin/env node
// tools/build_site_snapshot.mjs —— 把三路来源归一成公开静态数据快照。
// 读：characters/categories、投稿/owner-picks 清单、仓库外 blue-fish raw 清单与冻结映射。
// 写：dist/site-data.json、dist/site-data.js。幂等、无网络、确定性。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const RAW_PATH = process.env.BLUE_FISH_RAW || path.join(DIST, "data", "blue-fish-classification.json");
const UPSTREAM = "https://raw.githubusercontent.com/EDMOK/blue-fish-archive/main/";

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeIfChanged = (file, text) => {
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === text) return false;
  fs.writeFileSync(file, text, "utf8");
  return true;
};
const basename = (value) => String(value || "").split("/").pop();
const kindFor = (record) => {
  if (String(record.id || "").startsWith("sticker_op_")) return ["illustration"];
  if (/立绘|设定|三视图/.test(String(record.name || ""))) return ["setting"];
  return ["meme"];
};
const gate = (record) => {
  const name = String(record.name || "").trim();
  const tags = Array.isArray(record.tags) ? record.tags.map((x) => String(x || "").trim()).filter(Boolean) : [];
  const characterId = String(record.characterId || "").trim();
  return name && tags.length && characterId;
};
const rawUrl = (value) => `${UPSTREAM}${String(value || "").replace(/^\/+/, "")}`;

function main() {
  const characters = readJson(path.join(DIST, "characters.json"));
  const categories = readJson(path.join(DIST, "categories.json"));
  const submissions = readJson(path.join(DIST, "submissions", "works.json"));
  const ownerPicks = readJson(path.join(DIST, "owner-picks", "works.json"));
  const raw = readJson(RAW_PATH);
  const frozen = readJson(path.join(DIST, "blue-fish-ids.json"));
  const frozenByPath = new Map(Object.entries(frozen));
  const works = [];

  for (const record of [...submissions, ...ownerPicks]) {
    if (record.status !== "published") continue;
    works.push({
      ...record,
      categoryIds: Array.isArray(record.categoryIds) && record.categoryIds.length ? record.categoryIds : kindFor(record),
      thumbUrl: String(record.thumbnailPath || "").replace(/^\/+/, ""),
      displayUrl: String(record.fullPath || record.thumbnailPath || "").replace(/^\/+/, ""),
      originalUrl: String(record.path || ""),
      source: record.id.startsWith("sticker_op_") ? "owner-picks" : "submission"
    });
  }

  raw.forEach((record, index) => {
    if (!gate(record)) return;
    const sourcePath = String(record.sourcePath || "").trim();
    const frozenEntry = frozenByPath.get(sourcePath);
    if (!frozenEntry || !frozenEntry.id || !frozenEntry.slug) return;
    const filename = basename(record.previewPath || record.sourcePath);
    const preview = `data/blue-fish/previews/${encodeURIComponent(filename)}`;
    const format = String(record.format || "").toLowerCase();
    works.push({
      id: frozenEntry.id,
      slug: frozenEntry.slug,
      name: String(record.name).trim(),
      description: "首批收录自蓝色大肥鱼档案馆的公开清单；单条原作者与授权信息待补充，可在详情页申请署名或删除。",
      characterId: String(record.characterId).trim(),
      categoryIds: ["meme"],
      tags: record.tags.map((x) => String(x).trim()).filter(Boolean),
      format,
      mimeType: format === "jpg" || format === "jpeg" ? "image/jpeg" : `image/${format || "png"}`,
      isAnimated: format === "gif" || format === "apng",
      width: Number(record.width) || 1,
      height: Number(record.height) || 1,
      fileSize: Number(record.fileSize) || 0,
      sha256: "",
      submitter: { name: "上游清单导入", github: "" },
      origin: { type: "internet-found", author: "", sourceUrl: record.sourceUrl || null, note: "从公开上游清单导入；单条原作者信息待补充" },
      license: { type: "unknown", note: "" },
      status: "published",
      createdAt: "2026-09-15T00:00:00+08:00",
      updatedAt: "2026-09-15T00:00:00+08:00",
      path: rawUrl(sourcePath),
      thumbnailPath: preview,
      fullPath: preview,
      thumbUrl: preview,
      displayUrl: preview,
      originalUrl: rawUrl(sourcePath),
      tone: String(record.characterId).trim(),
      symbol: "",
      sourcePath,
      source: "blue-fish"
    });
  });

  const seen = new Set();
  const unique = works.filter((work) => {
    if (seen.has(work.id)) return false;
    seen.add(work.id);
    return true;
  }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || String(b.slug).localeCompare(String(a.slug)));

  const snapshot = {
    version: "2026-09-23-site-migration",
    characters,
    categories: [
      { id: "meme", name: "梗图", description: "表情包梗、聊天用图", status: "active" },
      { id: "illustration", name: "插画", description: "完整构图的绘画作品", status: "active" },
      { id: "setting", name: "设定图", description: "立绘、三视图、设定稿", status: "active" }
    ],
    works: unique
  };
  const json = `${JSON.stringify(snapshot, null, 2)}\n`;
  const js = `window.SITE_DATA = ${JSON.stringify(snapshot)}; window.DEMO = window.SITE_DATA;\n`;
  const jsonChanged = writeIfChanged(path.join(DIST, "site-data.json"), json);
  const jsChanged = writeIfChanged(path.join(DIST, "site-data.js"), js);
  console.log(`[snapshot] works=${unique.length} characters=${characters.length} json=${jsonChanged ? "written" : "unchanged"} js=${jsChanged ? "written" : "unchanged"}`);
}

main();
