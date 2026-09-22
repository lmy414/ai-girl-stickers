#!/usr/bin/env node
// tools/generate_sitemap.mjs —— 由 site-data.json 生成正式站 sitemap.xml（确定性、无网络）。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const ORIGIN = "https://xn--pssy23gqgbz2d718b.com";
const data = JSON.parse(fs.readFileSync(path.join(DIST, "site-data.json"), "utf8"));
const escapeXml = (v) => String(v).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"})[c]);
const staticPages = ["", "category.html", "submit.html", "about.html", "projects.html", "changelog.html"];
const urls = staticPages.map((rel) => ({ loc: `${ORIGIN}/${rel}`, lastmod: "2026-09-23" }));
for (const work of data.works) urls.push({ loc: `${ORIGIN}/works/${work.slug}.html`, lastmod: String(work.updatedAt || work.createdAt || "").slice(0, 10) || "2026-09-23" });
const body = urls.map(({loc,lastmod}) => `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${escapeXml(lastmod)}</lastmod>\n  </url>`).join("\n");
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
const out = path.join(DIST, "sitemap.xml");
if (!fs.existsSync(out) || fs.readFileSync(out, "utf8") !== xml) fs.writeFileSync(out, xml, "utf8");
console.log(`[sitemap] ${urls.length} URLs`);
