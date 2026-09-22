// tools/generate_work_pages.mjs —— 正式站作品详情页生成器：读 dist/site-data.json，生成 dist/works/<slug>.html。
// 重新生成：node tools/generate_work_pages.mjs
// 特性：Node 内置模块 only；幂等（每次先清 works/ 下旧 .html 再全量重建）；确定性（输出只由数据决定，无时间戳；
// 推荐排序、伪随机补足都走稳定种子，两次生成逐字节一致）。
// 长尾文案公式（SEO规范.md §2 title / §3 description / §4 keywords / §7 alt / §8 正文段）集中在
// 下面「文案渲染」一节、各一个函数；改公式只改那里。
// 推荐区口径见 SEO规范.md §9：同角色「更多{characterName}表情包」至多 4 张 + 跨角色「猜你喜欢」4 张，
// 任何一页都有推荐；信息区三层（角色卡 / 作品信息卡 / 授权便签）见 renderPage。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------- 路径与常量 ----------
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_PATH = path.join(REPO_ROOT, "dist", "site-data.json");
const OUT_DIR = path.join(REPO_ROOT, "dist", "works");

const SITE_ORIGIN = "https://xn--pssy23gqgbz2d718b.com"; // 中文域名一律 punycode（SEO规范.md §6）
const TAKEDOWN_URL = "https://github.com/lmy414/ai-girl-stickers/issues/new?template=takedown-request.yml";

const ORIGIN_LABELS = {
  "self-created": "自己创作或生成",
  "author-submitted": "原作者本人投稿",
  "internet-found": "网络整理",
  "community-created": "社区成员创作",
  unknown: "来源不明"
};
const LICENSE_LABELS = {
  "submitter-permission": "投稿者确认授权收录与下载",
  "author-permission": "原作者明确授权",
  cc0: "CC0 公共领域",
  "cc-by": "CC BY 署名",
  "cc-by-nc": "CC BY-NC 署名·非商用",
  unknown: "授权状态不明",
  removed: "已下架"
};
// {kindWord} 映射：按 categoryIds 首项（SEO规范.md 记号表）
const KIND_WORDS = { meme: "表情包", illustration: "二创插画", setting: "立绘设定图" };

// ---------- 通用工具 ----------
function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function formatSize(bytes) {
  const n = Number(bytes) || 0;
  const trim = (text) => text.replace(/\.0$/, "");
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${trim((n / 1024).toFixed(1))} KB`;
  return `${trim((n / 1024 / 1024).toFixed(1))} MB`;
}

function formatDate(iso) {
  const text = String(iso == null ? "" : iso).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "—";
}

function pageAsset(value) {
  const text = String(value || "");
  if (/^https?:\/\//i.test(text)) return text;
  return `../${text.replace(/^\/+/, "")}`;
}

function publicAsset(value) {
  const text = String(value || "");
  if (/^https?:\/\//i.test(text)) return text;
  return `${SITE_ORIGIN}/${text.replace(/^\/+/, "")}`;
}

function cmp(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

// 收录时间倒序（数值时间戳比较，时区偏移也能正确排序）；同一时刻按 slug 降序——
// slug 尾部序号按收录时间升序编，序号大 = 收录晚 = 更新，与「倒序取最新」口径一致。
function byNewest(a, b) {
  const ta = Date.parse(String(a.work.createdAt || "")) || 0;
  const tb = Date.parse(String(b.work.createdAt || "")) || 0;
  if (ta !== tb) return tb - ta;
  return cmp(String(b.work.slug), String(a.work.slug));
}

// FNV-1a 32 位哈希 + MurmurHash3 终混：给「猜你喜欢」的伪随机补足做固定种子（对 slug 取哈希取序）。
// 哈希输入含本页 slug，各页补足结果互不相同；输出只由 slug 决定，重生成稳定。
// 终混不能省：候选 slug 大多共享长前缀，纯 FNV-1a 排序会退化成「按尾字符排序」的假随机。
function hash32(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

// ---------- 上下文（文案公式的输入） ----------
function buildContext(work, character, titleVariant, totalCount) {
  const tags = Array.isArray(work.tags) ? work.tags.map((t) => String(t)) : [];
  const aliases = Array.isArray(character.aliases) ? character.aliases.map((a) => String(a)) : [];
  const kindWord = KIND_WORDS[String((work.categoryIds || [])[0])] || "作品";
  return {
    work,
    character,
    name: String(work.name || ""),
    characterId: String(work.characterId || ""),
    characterName: String(character.name || work.characterId || ""),
    aliases,
    aliasesJoined: aliases.join("、"),
    alias1: aliases[0] || "",
    tags,
    tagsJoined: tags.join("、"),
    tagWords: tags.slice(0, 2).join("、"),
    tagQuoteList: tags.slice(0, 2).map((t) => `「${t}」`).join(""),
    kindWord,
    // 「二创」前缀去重：kindWord 本身以「二创」开头（如二创插画）时不再叠加，避免「二创二创」堆砌
    kindClause: kindWord.startsWith("二创") ? kindWord : `二创${kindWord}`,
    titleVariant,
    totalCount,
    // 主流程回填：charInfo（角色卡素材）、relatedSame（推荐区一）、relatedGuess（推荐区二）
    charInfo: null,
    relatedSame: [],
    relatedGuess: []
  };
}

/* ================= 文案渲染（长尾公式唯一实现处，对齐 SEO规范.md） =================
   约定：渲染函数产出纯文本，转义在页面模板拼装时统一过 escapeHtml；
   降级分支：缺别名省略「（又称…）」/「{alias1}」退「AI娘」；缺 tag 中段退「AI娘二创表情包」、场景句收缩。 */

// §2 title：《{name}》{characterName}{kindWord} - {tag1}AI娘二创 | 蓝色大肥鱼
// 变体钩子：同一角色交替把中段换成 {alias1}表情包（如「蓝色大肥鱼表情包」），扩大长尾面；
// 无 tag 时中段换「AI娘二创表情包」；超长截中段，作品名 + 角色名 + 品类词必保，整条 ≤60 字符。
function renderTitle(ctx) {
  const head = `《${ctx.name}》${ctx.characterName}${ctx.kindWord}`;
  const sep = " - ";
  const tail = " | 蓝色大肥鱼";
  let mid;
  if (ctx.titleVariant === "alias" && ctx.alias1) mid = `${ctx.alias1}表情包`;
  else if (ctx.tagWords && ctx.tags[0]) mid = `${ctx.tags[0]}AI娘二创`;
  else mid = "AI娘二创表情包";
  const budget = 60 - head.length - sep.length - tail.length;
  if (budget < 2) return head + tail;
  if (mid.length > budget) mid = mid.slice(0, budget);
  return `${head}${sep}${mid}${tail}`;
}

// §3 description：多长尾自然句（渲染例见 SEO规范.md）
function renderDescription(ctx) {
  const aliasPart = ctx.aliasesJoined ? `（又称${ctx.aliasesJoined}）` : "";
  const topicPart = ctx.tagsJoined ? `，主题：${ctx.tagsJoined}` : "";
  const scenePart = ctx.tags[0]
    ? `适合${ctx.tagQuoteList}相关的聊天斗图、日常吐槽场景`
    : "聊天斗图、日常吐槽都能用";
  const aliasWord = ctx.alias1 || "AI娘";
  return `《${ctx.name}》${ctx.characterName}${ctx.kindClause}${aliasPart}${topicPart}。${scenePart}，可查看高清大图、免费下载原图。` +
    `更多${ctx.characterName}表情包、${aliasWord}梗图、AI娘二创同人图与立绘设定，尽在蓝色大肥鱼开放档案。`;
}

// §4 keywords：长尾组合 8–12 个（tag 取前 5；缺别名省略 {alias1}表情包）
function renderKeywords(ctx) {
  const items = [
    ctx.name,
    `${ctx.characterName}表情包`,
    `${ctx.characterName}${ctx.kindWord}`,
    ...(ctx.alias1 ? [`${ctx.alias1}表情包`] : []),
    ...ctx.tags.slice(0, 5),
    "AI娘表情包",
    "AI娘二创",
    `${ctx.kindWord}下载`
  ];
  return items.join(",");
}

// §7 alt：《{name}》{characterName}{kindWord}，{tags顿号}AI娘二创图（主图与相关缩略图同公式）
function renderAlt(ctx) {
  const tagPart = ctx.tagsJoined ? ctx.tagsJoined : "";
  return `《${ctx.name}》${ctx.characterName}${ctx.kindWord}，${tagPart}AI娘二创图`;
}

// §8 正文长尾段：紧跟 H1，承接「原图」「下载」等意图词
function renderBodyParagraph(ctx) {
  const aliasPart = ctx.aliasesJoined ? `（又称${ctx.aliasesJoined}）` : "";
  const scenePart = ctx.tagsJoined
    ? `画面围绕「${ctx.tagsJoined}」展开，适合${ctx.tagWords}相关的聊天斗图与日常表达。`
    : "适合聊天斗图与日常表达。";
  const aliasWord = ctx.alias1 || "AI娘";
  return `《${ctx.name}》是${ctx.characterName}${aliasPart}的${ctx.kindClause}，${scenePart}` +
    `本站提供${ctx.characterName}表情包高清查看与原图免费下载，收录了${aliasWord}梗图、AI娘二创同人图、` +
    `${ctx.characterName}立绘设定等${ctx.totalCount}件作品，欢迎按角色与分类浏览。`;
}

/* ================= 页面模板 ================= */

// 页面专属样式：只补布局，公共组件用 shared/styles.css；颜色 / 字号 / 间距 / 圆角 / 阴影只用变量
const PAGE_CSS = `    .breadcrumb {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      margin-bottom: var(--space-4);
      font-family: var(--font-hand);
      font-size: var(--text-md);
      color: var(--text-secondary);
    }
    .breadcrumb .crumb-sep { color: var(--text-tertiary); }
    .work-intro { max-width: var(--measure-base); margin: 0 0 var(--space-5); }

    .work-figure { margin: 0; }
    .work-figure img {
      display: block;
      width: 100%;
      height: auto;
      background: var(--bg-inset);
      border: 2px solid var(--border-strong);
      border-radius: var(--radius-xs);
    }
    .work-figure figcaption {
      margin-top: var(--space-2);
      text-align: center;
      font-family: var(--font-hand);
      font-size: var(--text-md);
      color: var(--text-secondary);
    }
    .work-actions { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-top: var(--space-4); }

    .info-title {
      margin: 0 0 var(--space-3);
      font-family: var(--font-marker);
      font-weight: normal;
      font-size: var(--text-xl);
    }

    /* ---- 右栏三层：角色卡 / 作品信息卡 / 授权便签（纸卡风，微旋转 + 胶带 + 便签底） ---- */
    .info-stack { display: flex; flex-direction: column; gap: var(--space-5); }

    .char-card {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      transform: rotate(-0.6deg);
    }
    .char-avatar {
      width: 64px;
      height: 64px;
      flex: none;
      object-fit: cover;
      background: var(--bg-inset);
      border: 2px solid var(--border-strong);
      border-radius: var(--radius-md);
    }
    .char-card-body { min-width: 0; }
    .char-name {
      margin: 0;
      font-family: var(--font-marker);
      font-weight: normal;
      font-size: var(--text-xl);
      line-height: 1.25;
    }
    .char-aliases {
      margin: 2px 0 0;
      font-family: var(--font-hand);
      font-size: var(--text-md);
      color: var(--text-secondary);
    }
    .char-count { margin: 2px 0 0; font-family: var(--font-hand); font-size: var(--text-md); }

    /* 字段行「贴纸行」感：label 手写小字、值加粗清晰，行间点线分隔 */
    .info-list {
      display: grid;
      grid-template-columns: max-content minmax(0, 1fr);
      gap: var(--space-2) var(--space-4);
      margin: 0;
    }
    .info-list dt {
      align-self: center;
      color: var(--text-secondary);
      font-family: var(--font-hand);
      font-size: var(--text-sm);
      font-weight: var(--weight-bold);
    }
    .info-list dd {
      margin: 0;
      min-width: 0;
      overflow-wrap: anywhere;
      font-weight: var(--weight-bold);
    }
    .info-list dt, .info-list dd {
      padding-bottom: var(--space-1);
      border-bottom: 1px dotted var(--border-subtle);
    }

    /* 贴纸徽标：便签底 + 细墨线 + 微旋转（格式 / 尺寸 / 体积） */
    .sticker-tag {
      display: inline-block;
      padding: 0 var(--space-3);
      background: var(--sticky-2);
      border: 1.5px solid var(--border-strong);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-paper-sm);
      transform: rotate(-1deg);
      font-family: var(--font-hand);
      font-size: var(--text-md);
      font-weight: var(--weight-bold);
      line-height: 1.8;
    }
    /* 授权状态色块徽标：明确授权用 marker-soft 底；unknown / removed 退白底 + 墨线 */
    .license-tag {
      display: inline-block;
      padding: 0 var(--space-3);
      background: var(--marker-soft);
      border: 1.5px solid var(--border-strong);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-paper-sm);
      transform: rotate(0.8deg);
      font-family: var(--font-hand);
      font-size: var(--text-md);
      font-weight: var(--weight-bold);
      line-height: 1.8;
    }
    .license-tag.is-unknown { background: var(--paper-card); }

    .tag-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      margin-top: var(--space-5);
      padding-top: var(--space-4);
      border-top: 1px dashed var(--border-subtle);
    }
    .tag-label {
      margin: 0;
      font-family: var(--font-hand);
      font-size: var(--text-md);
      font-weight: var(--weight-bold);
      color: var(--text-secondary);
    }

    /* 授权便签：sticky-1 便签底 + 微旋转（±1deg）+ 胶带 */
    .license-note {
      position: relative;
      margin: 0;
      padding: var(--space-4) var(--space-5) var(--space-3);
      background: var(--sticky-1);
      border: 2px solid var(--border-default);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-paper-sm);
      transform: rotate(1deg);
    }
    .license-note-label {
      margin: 0 0 var(--space-2);
      font-family: var(--font-marker);
      font-weight: normal;
      font-size: var(--text-lg);
    }
    .license-text { margin: 0 0 var(--space-2); font-family: var(--font-hand); font-size: var(--text-md); }
    .license-footnote { margin: 0; font-size: var(--text-sm); color: var(--text-secondary); }

    .related-grid { display: flex; flex-wrap: wrap; gap: var(--space-4); }
    .related-grid .card { width: 200px; max-width: 100%; margin: 0; }
    .empty-note {
      display: inline-block;
      margin: 0;
      padding: var(--space-2) var(--space-4);
      background: var(--sticky-1);
      border: 2px solid var(--border-default);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-paper-sm);
      transform: rotate(-0.6deg);
      font-family: var(--font-hand);
      font-size: var(--text-lg);
      color: var(--text-primary);
    }`;

// 复制 canonical URL 的内联 JS：每页同一段（URL 从 <link rel="canonical"> 取）
const COPY_CANONICAL_JS = `  <script>
    (function () {
      "use strict";
      var btn = document.querySelector("[data-copy-canonical]");
      if (!btn) return;
      btn.addEventListener("click", function () {
        var link = document.querySelector('link[rel="canonical"]');
        var url = link ? link.href : window.location.href;
        var flash = function () {
          btn.textContent = "已复制";
          window.setTimeout(function () { btn.textContent = "复制链接"; }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(flash, function () { window.prompt("复制链接：", url); });
        } else {
          window.prompt("复制链接：", url);
        }
      });
    })();
  </script>`;

// 推荐卡网格（两个推荐区共用）：.card 拍立得式，图 + 标题 + 角色名；img alt 走 §7 公式（各用对方字段渲染）
function renderCardGrid(items) {
  const cards = items
    .map(
      (item) => `        <a class="card related-card" href="${escapeHtml(item.work.slug + ".html")}">
          <img class="card-art" src="${escapeHtml(pageAsset(item.work.thumbUrl))}" alt="${escapeHtml(renderAlt(item))}" width="${escapeHtml(item.work.width)}" height="${escapeHtml(item.work.height)}" loading="lazy" />
          <div class="card-body">
            <h3 class="card-title">《${escapeHtml(item.name)}》</h3>
            <p class="card-meta">${escapeHtml(item.characterName)} · ${escapeHtml(item.kindWord)}</p>
          </div>
        </a>`
    )
    .join("\n");
  return `      <div class="related-grid">\n${cards}\n      </div>`;
}

function renderPage(ctx) {
  const e = escapeHtml;
  const { work, character } = ctx;
  const title = renderTitle(ctx);
  const description = renderDescription(ctx);
  const keywords = renderKeywords(ctx);
  const altText = renderAlt(ctx);
  const intro = renderBodyParagraph(ctx);
  const canonical = `${SITE_ORIGIN}/works/${work.slug}.html`;

  const origin = work.origin || {};
  const license = work.license || {};
  const submitter = work.submitter || {};
  const originLabel = ORIGIN_LABELS[origin.type] || ORIGIN_LABELS.unknown;
  const licenseLabel = LICENSE_LABELS[license.type] || LICENSE_LABELS.unknown;
  const originAuthor = String(origin.author || "").trim();
  const licenseNote = String(license.note || "").trim();
  const submitterName = String(submitter.name || "").trim();
  const submitterGithub = String(submitter.github || "").trim();
  const sourceUrl = String(origin.sourceUrl || "").trim();

  const submitterHtml = submitterGithub
    ? `<a href="https://github.com/${e(submitterGithub)}" target="_blank" rel="noopener">${e(submitterName || "未标注")}</a>`
    : e(submitterName || "未标注");
  const sourceHtml = sourceUrl
    ? `<a href="${e(sourceUrl)}" target="_blank" rel="noopener">${e(sourceUrl)}</a>`
    : "—";

  // 关键值贴纸徽章：格式 / 尺寸 / 体积；授权状态色块徽标（unknown / removed 退白底 + 墨线）
  const formatBadge = `<span class="sticker-tag">${e(String(work.format || "").toUpperCase())}</span>`;
  const dimensionBadge = `<span class="sticker-tag">${e(work.width)}×${e(work.height)} px</span>`;
  const volumeBadge = `<span class="sticker-tag">${e(formatSize(work.fileSize))}</span>`;
  const licensePositive = ["submitter-permission", "author-permission", "cc0", "cc-by", "cc-by-nc"].includes(String(license.type));
  const licenseBadge = `<span class="license-tag${licensePositive ? "" : " is-unknown"}">${e(licenseLabel)}</span>`;

  const infoRows = [
    ["类型", e(ctx.kindWord)],
    ["格式", formatBadge],
    ["尺寸", dimensionBadge],
    ["体积", volumeBadge],
    ["提交者", submitterHtml],
    ["来源类型", e(originLabel)],
    ["来源作者", e(originAuthor || "未标注")],
    ["来源链接", sourceHtml],
    ["授权状态", licenseBadge],
    ["收录时间", e(formatDate(work.createdAt))]
  ];
  const infoRowsHtml = infoRows.map(([label, value]) => `            <dt>${label}</dt><dd>${value}</dd>`).join("\n");

  const chipsHtml = ctx.tags.length
    ? ctx.tags
        .map((tag) => `              <a class="chip" href="../category.html#q=${e(encodeURIComponent(tag))}">${e(tag)}</a>`)
        .join("\n")
    : `              <span class="chip">—</span>`;

  // 角色卡素材：小头像取该角色最新一张作品的 thumbUrl（取不到退 shared/avatar.png）
  const charInfo = ctx.charInfo || { count: 1, avatarThumb: "", avatarCtx: null };
  const avatarThumb = charInfo.avatarThumb ? pageAsset(charInfo.avatarThumb) : "../avatar.png";
  const avatarAlt = charInfo.avatarCtx ? renderAlt(charInfo.avatarCtx) : "";
  const aliasLineHtml = ctx.aliasesJoined ? `            <p class="char-aliases">又称${e(ctx.aliasesJoined)}</p>` : "";

  const sameHtml = ctx.relatedSame.length
    ? renderCardGrid(ctx.relatedSame)
    : `      <p class="empty-note">该角色暂无更多作品</p>`;
  const guessHtml = ctx.relatedGuess.length
    ? renderCardGrid(ctx.relatedGuess)
    : `      <p class="empty-note">暂无更多推荐</p>`;

  // §10 JSON-LD（ImageObject）。内容在 <script> 里是原始文本，走 JSON 转义（该语境下的转义），
  // 另把 "<" 转 \\u003c 防止数据里的 "</script>" 闭合标签。
  const ld = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    name: work.name,
    description,
    contentUrl: publicAsset(work.displayUrl),
    thumbnailUrl: publicAsset(work.thumbUrl),
    uploadDate: work.createdAt,
    creator: { "@type": "Person", name: originAuthor || submitterName || "未标注" },
    license: licenseNote || licenseLabel,
    keywords: ctx.tags.join(","),
    genre: ctx.kindWord
  };
  const ldJson = JSON.stringify(ld, null, 2).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${e(title)}</title>
  <meta name="description" content="${e(description)}" />
  <meta name="keywords" content="${e(keywords)}" />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="${e(canonical)}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${e(title)}" />
  <meta property="og:description" content="${e(description)}" />
  <meta property="og:url" content="${e(canonical)}" />
  <meta property="og:image" content="${e(publicAsset(work.displayUrl))}" />
  <meta property="og:site_name" content="蓝色大肥鱼" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="stylesheet" href="../tokens.css?v=14" />
  <link rel="stylesheet" href="../styles.css?v=18" />
  <script src="../analytics.js" defer></script>
  <style>
${PAGE_CSS}
  </style>
  <script type="application/ld+json">${ldJson}</script>
</head>
<body>
  <header class="topbar">
    <a class="brand" href="../index.html"><span class="brand-mark"><img src="../avatar.png" alt="" /></span><span class="brand-text"><strong>蓝色大肥鱼</strong><small>AI 娘表情包开放档案</small></span></a>
    <nav class="topnav"><a href="../index.html">首页</a><a href="../category.html">分类</a><a href="../submit.html">投稿</a><a href="../about.html">关于</a><a href="../projects.html">推荐</a></nav>
  </header>
  <main class="page">
    <nav class="breadcrumb" aria-label="面包屑"><a href="../index.html">全部作品</a><span class="crumb-sep" aria-hidden="true">→</span><a href="../category.html#c=${e(ctx.characterId)}">${e(ctx.characterName)}</a><span class="crumb-sep" aria-hidden="true">→</span><span>《${e(ctx.name)}》</span></nav>
    <h1 class="page-title">《${e(ctx.name)}》</h1>
    <p class="work-intro">${e(intro)}</p>
    <div class="grid-2">
      <div class="panel">
        <span class="tape-strip" aria-hidden="true"></span>
        <figure class="work-figure">
          <img src="${e(pageAsset(work.displayUrl))}" alt="${e(altText)}" width="${e(work.width)}" height="${e(work.height)}" loading="eager" />
          <figcaption>《${e(ctx.name)}》· ${e(ctx.characterName)}</figcaption>
        </figure>
        <div class="work-actions">
          <a class="btn primary hover-wiggle" href="${e(work.originalUrl)}" target="_blank" rel="noopener">下载原图</a>
          <button class="btn" type="button" data-copy-canonical>复制链接</button>
        </div>
      </div>
      <div class="info-stack">
        <div class="panel char-card">
          <span class="tape-strip" aria-hidden="true"></span>
          <img class="char-avatar" src="${e(avatarThumb)}" alt="${e(avatarAlt)}" width="64" height="64"${avatarAlt ? "" : ' aria-hidden="true"'} loading="lazy" />
          <div class="char-card-body">
            <p class="char-name">${e(ctx.characterName)}</p>
${aliasLineHtml}
            <p class="char-count"><a href="../category.html#c=${e(ctx.characterId)}">共 ${e(charInfo.count)} 件作品</a></p>
          </div>
        </div>
        <div class="panel">
          <h2 class="info-title">作品信息</h2>
          <dl class="info-list">
${infoRowsHtml}
          </dl>
          <div class="tag-row">
            <p class="tag-label">标签</p>
            <div class="chips">
${chipsHtml}
            </div>
          </div>
        </div>
        <div class="license-note">
          <span class="tape-strip" aria-hidden="true"></span>
          <p class="license-note-label">授权说明</p>
          <p class="license-text">${e(licenseNote || "—")}</p>
          <p class="license-footnote">图片版权归原作者所有；<a href="${e(TAKEDOWN_URL)}">申请署名、修改或删除</a>。</p>
        </div>
      </div>
    </div>
    <h2 class="section-label">评论</h2>
    <div class="panel giscus-panel">
      <script src="https://giscus.app/client.js" data-repo="lmy414/lmy414-blog-comments" data-repo-id="R_kgDOTUvnVw" data-category="Announcements" data-category-id="DIC_kwDOTUvnV84DF4fs" data-mapping="specific" data-term="${e(`sticker-${work.id}`)}" data-reactions-enabled="1" data-input-position="bottom" data-theme="light" data-lang="zh-CN" crossorigin="anonymous" async></script>
    </div>
    <h2 class="section-label">更多${e(ctx.characterName)}表情包</h2>
${sameHtml}
    <h2 class="section-label">猜你喜欢</h2>
${guessHtml}
  </main>
  <footer class="site-footer"><p>非官方同人整理项目，图片版权归原作者所有。本站使用最小化 Google Analytics 了解页面与性能表现，不建立热度排行。</p><p><a href="../changelog.html">更新日志</a> · <a href="../about.html#analytics">统计与隐私</a></p></footer>
${COPY_CANONICAL_JS}
</body>
</html>
`;
}

// ---------- 主流程 ----------
const DEMO = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const characters = Array.isArray(DEMO.characters) ? DEMO.characters : [];
const works = Array.isArray(DEMO.works) ? DEMO.works : [];
const charById = new Map(characters.map((c) => [c.id, c]));

// title 变体（§2 变体钩子）：同一角色按 slug 升序交替「tag 中段 / alias 中段」，确定性、与数据排列顺序解耦
const variantBySlug = new Map();
const slugsByCharacter = new Map();
for (const work of works) {
  const key = String(work.characterId || "");
  if (!slugsByCharacter.has(key)) slugsByCharacter.set(key, []);
  slugsByCharacter.get(key).push(String(work.slug || ""));
}
for (const slugs of slugsByCharacter.values()) {
  slugs.sort(cmp);
  slugs.forEach((slug, index) => variantBySlug.set(slug, index % 2 === 1 ? "alias" : "tag"));
}

const pages = works.map((work) => {
  const character = charById.get(work.characterId) || { id: work.characterId, name: work.characterId, aliases: [] };
  return buildContext(work, character, variantBySlug.get(work.slug) || "tag", works.length);
});

// 角色卡素材：每角色作品数 + 最新一张作品（byNewest 口径）的 thumbUrl 当头像，同角色共享一份
const pagesByCharacter = new Map();
for (const page of pages) {
  const key = page.characterId;
  if (!pagesByCharacter.has(key)) pagesByCharacter.set(key, []);
  pagesByCharacter.get(key).push(page);
}
for (const list of pagesByCharacter.values()) {
  const latest = [...list].sort(byNewest)[0] || null;
  const charInfo = {
    count: list.length,
    avatarThumb: String((latest && latest.work.thumbUrl) || "").trim(),
    avatarCtx: latest
  };
  for (const page of list) page.charInfo = charInfo;
}

// 推荐区一「更多{characterName}表情包」：同角色除自己外、收录时间倒序取 4 张（SEO规范.md §9）。
// 推荐区二「猜你喜欢」：跨角色、有共同 tag 的优先（共同 tag 数倒序 → 收录时间倒序 → slug 升序），
// 不足用固定种子伪随机（hash32(本页slug|候选slug) 取序）从全库补足 4 张；与推荐区一去重、排除自己。
// 两块合起来保证任何一页都有推荐：孤品角色第一块显便签提示、第二块照常 4 张。
for (const page of pages) {
  const relatedSame = pages
    .filter((item) => item.characterId === page.characterId && item.work.slug !== page.work.slug)
    .sort(byNewest)
    .slice(0, 4);
  const usedSlugs = new Set([page.work.slug, ...relatedSame.map((item) => item.work.slug)]);
  const ownTags = new Set(page.tags);
  const sharedTagCount = (item) => item.tags.reduce((n, tag) => n + (ownTags.has(tag) ? 1 : 0), 0);
  const relatedGuess = pages
    .filter((item) => item.characterId !== page.characterId && !usedSlugs.has(item.work.slug) && sharedTagCount(item) > 0)
    .sort((a, b) => sharedTagCount(b) - sharedTagCount(a) || byNewest(a, b))
    .slice(0, 4);
  if (relatedGuess.length < 4) {
    const picked = new Set(relatedGuess.map((item) => item.work.slug));
    const pool = pages
      .filter((item) => !usedSlugs.has(item.work.slug) && !picked.has(item.work.slug))
      .sort((a, b) => {
        const ha = hash32(`${page.work.slug}|${a.work.slug}`);
        const hb = hash32(`${page.work.slug}|${b.work.slug}`);
        return ha - hb || cmp(String(a.work.slug), String(b.work.slug));
      });
    relatedGuess.push(...pool.slice(0, 4 - relatedGuess.length));
  }
  page.relatedSame = relatedSame;
  page.relatedGuess = relatedGuess;
}

// 幂等：先清 works/ 旧 .html，再全量写
fs.mkdirSync(OUT_DIR, { recursive: true });
for (const file of fs.readdirSync(OUT_DIR)) {
  if (file.endsWith(".html")) fs.unlinkSync(path.join(OUT_DIR, file));
}
for (const page of pages) {
  fs.writeFileSync(path.join(OUT_DIR, `${page.work.slug}.html`), renderPage(page), "utf8");
}

// 汇报：生成数量 + 抽样 3 个文件名 + 任一页渲染出的 title/description
const sampleIndex = [...new Set([0, Math.floor(pages.length / 2), pages.length - 1])];
const sampleFiles = sampleIndex.map((i) => `${pages[i].work.slug}.html`);
console.log(`works 详情页已生成：${pages.length} 个 → ${path.relative(REPO_ROOT, OUT_DIR).replace(/\\/g, "/")}/`);
console.log(`抽样文件名：${sampleFiles.join("、")}`);
const sample = pages[0];
console.log(`抽样渲染（${sample.work.slug}）：`);
console.log(`  title：${renderTitle(sample)}`);
console.log(`  description：${renderDescription(sample)}`);
console.log(`  推荐区一（更多${sample.characterName}表情包）：${sample.relatedSame.map((item) => item.work.slug).join("、") || "（便签提示）"}`);
console.log(`  推荐区二（猜你喜欢）：${sample.relatedGuess.map((item) => item.work.slug).join("、") || "（无）"}`);
