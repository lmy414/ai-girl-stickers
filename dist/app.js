/* ==========================================================================
   蓝色大肥鱼 · 前端
   --------------------------------------------------------------------------
   单文件、无构建、无依赖。模块顺序：
     1 配置 → 2 数据 → 3 工具 → 4 图标 → 5 视图 → 6 评论区 → 7 交互 → 8 启动

   路由（hash 形式，静态托管可直接用）：
     #/                  作品列表
     #/character/<id>    角色作品列表
     #/tag/<tag>         标签作品列表
     #/work/<id>         作品详情页（含评论区）
     #/about             关于本站
   ========================================================================== */

/* ==========================================================================
   1 · 配置
   ========================================================================== */
const CONFIG = {
  siteName: "蓝色大肥鱼",
  /* 投稿与版权请求都走公开仓库的 Issue；模板在仓库 .github/ISSUE_TEMPLATE/ 下。 */
  repositoryUrl: "https://github.com/lmy414/ai-girl-stickers",
  /* 首批图片的原图放在上游仓库；后续投稿的图片直接进本仓库，
     所以取原图地址时要按记录区分仓库，不能写死一个。 */
  upstreamRepo: "EDMOK/blue-fish-archive",
  comments: {
    /* provider: "giscus" | "none" —— 见 README.md「评论接入」 */
    provider: "giscus",
    giscus: {
      repo: "lmy414/lmy414-blog-comments",   /* 与博客评论区共用的仓库，已开启 Discussions */
      repoId: "R_kgDOTUvnVw",
      category: "Announcements",
      categoryId: "DIC_kwDOTUvnV84DF4fs",
      reactionsEnabled: true,
      inputPosition: "bottom"
    }
  },
  /* 本地首批预览导入：仅在本地存在时启用，未导入时仍回退到演示数据。 */
  localDataUrl: "data/blue-fish-classification.json",
  /* 站长自用板块：清单与预览都进仓库，字段已是 数据契约.md 的正式形状。 */
  ownerPicksDataUrl: "owner-picks/works.json",
  /* 键名带版本：改版后换键可以让旧的深色偏好失效，默认回到亮色 */
  theme: { storageKey: "aigirl-theme-2", default: "light" }
};

/* ==========================================================================
   2 · 数据（字段与 数据契约.md 对齐；下载量等热度字段已移除）
   ========================================================================== */
const characters = [
  { id: "all", name: "全部角色", aliases: [] },
  { id: "deepseek", name: "DeepSeek娘", aliases: ["蓝色大肥鱼", "鲸鱼娘"] },
  { id: "doubao", name: "豆包娘", aliases: ["豆包"] },
  { id: "kimi", name: "Kimi娘", aliases: ["Kimi"] },
  { id: "qwen", name: "通义千问娘", aliases: ["千问娘", "Qwen"] },
  { id: "claude", name: "Claude娘", aliases: ["Claude"] },
  { id: "gemini", name: "Gemini娘", aliases: ["Gemini"] },
  { id: "grok", name: "Grok娘", aliases: ["Grok"] },
  { id: "other", name: "其他角色", aliases: [] },
  /* 不是角色，是站长的自用图集；所以不出现在投稿模板的角色下拉里。 */
  { id: "owner-picks", name: "站长自用", aliases: ["站长自用图", "自用"] }
];

const stickers = [
  {
    id: "sticker_001", name: "今天也要吃 Token", description: "蓝色大肥鱼的日常补给，适合开工前给自己打气。",
    characterId: "deepseek", tags: ["日常", "吃饭"], format: "webp", isAnimated: false,
    width: 512, height: 512, fileSize: 183420,
    submitter: { name: "fishfan", github: "fishfan" },
    origin: { type: "self-created", author: "fishfan", sourceUrl: null, note: "本人使用 AI 生成" },
    license: { type: "submitter-permission" }, createdAt: "2026-09-14T11:20:00+08:00",
    tone: "deepseek", symbol: "◒"
  },
  {
    id: "sticker_002", name: "这合理吗", description: "适合表达质疑、困惑和无语的场合。",
    characterId: "deepseek", tags: ["吐槽", "疑问"], format: "png", isAnimated: false,
    width: 768, height: 768, fileSize: 321800,
    submitter: { name: "mori", github: "mori" },
    origin: { type: "internet-found", author: "", sourceUrl: null, note: "来源帖已不可考" },
    license: { type: "unknown" }, createdAt: "2026-09-13T09:05:00+08:00",
    tone: "deepseek", symbol: "?"
  },
  {
    id: "sticker_003", name: "我来帮你想想", description: "先思考一下，再决定要不要回答。",
    characterId: "deepseek", tags: ["思考", "回答"], format: "gif", isAnimated: true,
    width: 420, height: 420, fileSize: 1283400,
    submitter: { name: "luna", github: "luna-dev" },
    origin: { type: "self-created", author: "luna", sourceUrl: null, note: "逐帧手绘" },
    license: { type: "submitter-permission" }, createdAt: "2026-09-11T20:40:00+08:00",
    tone: "deepseek", symbol: "…"
  },
  {
    id: "sticker_004", name: "豆包启动！", description: "热情上线，准备接住新的问题。",
    characterId: "doubao", tags: ["启动", "可爱"], format: "webp", isAnimated: false,
    width: 512, height: 640, fileSize: 218900,
    submitter: { name: "baozi", github: "baozi" },
    origin: { type: "self-created", author: "baozi", sourceUrl: null, note: "" },
    license: { type: "submitter-permission" }, createdAt: "2026-09-12T15:10:00+08:00",
    tone: "doubao", symbol: "✦"
  },
  {
    id: "sticker_005", name: "让我想一下喵", description: "面对复杂问题的短暂加载中。",
    characterId: "kimi", tags: ["加载", "卖萌"], format: "png", isAnimated: false,
    width: 600, height: 820, fileSize: 408600,
    submitter: { name: "neko", github: "neko-ai" },
    origin: { type: "author-submitted", author: "neko", sourceUrl: null, note: "原作者本人投稿" },
    license: { type: "author-permission" }, createdAt: "2026-09-10T13:25:00+08:00",
    tone: "kimi", symbol: "⌁"
  },
  {
    id: "sticker_006", name: "千问已收到", description: "确认收到消息，正在处理。",
    characterId: "qwen", tags: ["收到", "工作"], format: "apng", isAnimated: true,
    width: 480, height: 480, fileSize: 993200,
    submitter: { name: "qianqian", github: "qianqian" },
    origin: { type: "community-created", author: "千问娘同好组", sourceUrl: null, note: "" },
    license: { type: "submitter-permission" }, createdAt: "2026-09-09T18:00:00+08:00",
    tone: "qwen", symbol: "✓"
  },
  {
    id: "sticker_007", name: "Claude 的沉思", description: "安静、认真地把问题拆开。",
    characterId: "claude", tags: ["思考", "认真"], format: "jpg", isAnimated: false,
    width: 900, height: 900, fileSize: 276400,
    submitter: { name: "paperboat", github: "paperboat" },
    origin: { type: "internet-found", author: "", sourceUrl: null, note: "整理自公开讨论串" },
    license: { type: "unknown" }, createdAt: "2026-09-08T10:30:00+08:00",
    tone: "claude", symbol: "◌"
  },
  {
    id: "sticker_008", name: "Gemini 双倍确认", description: "把两个答案都放在这里。",
    characterId: "gemini", tags: ["确认", "双倍"], format: "webp", isAnimated: false,
    width: 512, height: 512, fileSize: 182100,
    submitter: { name: "starry", github: "starry-night" },
    origin: { type: "self-created", author: "starry", sourceUrl: null, note: "" },
    license: { type: "submitter-permission" }, createdAt: "2026-09-07T21:15:00+08:00",
    tone: "gemini", symbol: "✧"
  },
  {
    id: "sticker_009", name: "Grok 看到了", description: "带一点坏笑的已读状态。",
    characterId: "grok", tags: ["已读", "坏笑"], format: "gif", isAnimated: true,
    width: 500, height: 500, fileSize: 745800,
    submitter: { name: "xoxo", github: "xoxo" },
    origin: { type: "community-created", author: "xoxo", sourceUrl: null, note: "群友协作" },
    license: { type: "author-permission" }, createdAt: "2026-09-06T08:45:00+08:00",
    tone: "grok", symbol: "◉"
  },
  {
    id: "sticker_010", name: "AI 娘集合！", description: "不同角色的友好碰面，适合当合集封面。",
    characterId: "other", tags: ["合照", "集合"], format: "png", isAnimated: false,
    width: 1024, height: 620, fileSize: 512900,
    submitter: { name: "studio", github: "studio" },
    origin: { type: "self-created", author: "studio", sourceUrl: null, note: "" },
    license: { type: "submitter-permission" }, createdAt: "2026-09-05T19:30:00+08:00",
    tone: "other", symbol: "AI"
  },
  {
    id: "sticker_011", name: "请重新描述问题", description: "没有拒绝，只是需要更多上下文。",
    characterId: "deepseek", tags: ["回答", "委婉"], format: "webp", isAnimated: false,
    width: 640, height: 640, fileSize: 226700,
    submitter: { name: "mori", github: "mori" },
    origin: { type: "self-created", author: "mori", sourceUrl: null, note: "" },
    license: { type: "submitter-permission" }, createdAt: "2026-09-04T14:00:00+08:00",
    tone: "deepseek", symbol: "↺"
  },
  {
    id: "sticker_012", name: "先这样吧", description: "今天的工作先到这里。",
    characterId: "doubao", tags: ["下班", "结束"], format: "jpg", isAnimated: false,
    width: 760, height: 760, fileSize: 302400,
    submitter: { name: "baozi", github: "baozi" },
    origin: { type: "author-submitted", author: "baozi", sourceUrl: null, note: "" },
    license: { type: "author-permission" }, createdAt: "2026-09-03T17:50:00+08:00",
    tone: "doubao", symbol: "☾"
  }
];

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
  removed: "已撤下"
};

const MIME_BY_FORMAT = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  gif: "image/gif", webp: "image/webp", apng: "image/apng", svg: "image/svg+xml"
};

const SORT_OPTIONS = [
  { value: "latest", label: "最新收录" },
  { value: "oldest", label: "最早收录" },
  { value: "name", label: "名称正序" },
  { value: "name-desc", label: "名称倒序" },
  { value: "size", label: "文件体积" },
  { value: "random", label: "随机浏览" }
];

/* ---------------------------------------------------------------------------
   演示数据：为了让「无限向下加载」能真的滑起来，上面 12 条手写作品之外再按索引
   确定性地生成一批占位作品——名称、Tag、尺寸、格式全部由索引推导，刷新不变。
   接入真实投稿数据后，删掉这段生成逻辑（连同 PLACEHOLDER_* 常量）即可。
   --------------------------------------------------------------------------- */
const PLACEHOLDER_TOTAL = 168;

const PLACEHOLDER_PHRASES = [
  "摸鱼中", "已读不回", "正在思考", "加载中", "收到收到", "下班啦", "上线打卡", "再讲一遍",
  "我裂开了", "好耶", "让我看看", "等一下下", "写不完", "正在输出", "别催了", "开始装死",
  "好困啊", "举手提问", "我先睡了", "赞一个", "比心", "疑惑", "无语凝噎", "求放过",
  "开工大吉", "今天也努力", "摸一下鱼", "我需要上下文", "答案在上面", "太长了不看", "重新提问",
  "已阅", "在忙", "稍后回复", "无能为力", "这题我熟", "别问了", "正在检索", "缓存命中",
  "训练中"
];

const PLACEHOLDER_TAGS = [
  "日常", "吃饭", "吐槽", "疑问", "思考", "回答", "加载", "卖萌", "收到", "工作",
  "已读", "坏笑", "合照", "集合", "启动", "可爱", "下班", "结束", "委婉", "认真",
  "加班", "摸鱼", "求助", "道歉"
];

const PLACEHOLDER_SUBMITTERS = ["fishfan", "mori", "luna", "baozi", "neko", "qianqian", "paperboat", "starry"];
const PLACEHOLDER_SYMBOLS = ["◒", "?", "…", "✦", "⌁", "✓", "◌", "✧", "◉", "↺", "☾", "◐", "※", "✳", "◎", "◍"];
/* 尺寸摆成常见的表情包比例，瀑布流才有高低错落 */
const PLACEHOLDER_ASPECTS = [
  [512, 512], [768, 768], [512, 640], [600, 820], [900, 900], [1024, 620],
  [640, 480], [480, 480], [760, 760], [560, 720], [420, 420], [820, 560]
];

function generatePlaceholderWorks(total) {
  const roles = characters.filter((character) => character.id !== "all");
  const origins = Object.keys(ORIGIN_LABELS);
  const licenses = Object.keys(LICENSE_LABELS);
  const formats = ["webp", "png", "jpg", "gif", "apng"];
  const works = [];

  for (let index = 0; index < total; index += 1) {
    const character = roles[index % roles.length];
    /* 乘数与池长度互质，保证每个尺度都能轮满一圈，不会只用前几个 */
    const [width, height] = PLACEHOLDER_ASPECTS[(index * 5) % PLACEHOLDER_ASPECTS.length];
    const format = formats[(index * 3) % formats.length];
    const submitter = PLACEHOLDER_SUBMITTERS[(index * 5) % PLACEHOLDER_SUBMITTERS.length];
    const tagA = PLACEHOLDER_TAGS[(index * 5) % PLACEHOLDER_TAGS.length];
    const tagB = PLACEHOLDER_TAGS[(index * 11) % PLACEHOLDER_TAGS.length];
    const symbol = PLACEHOLDER_SYMBOLS[(index * 7) % PLACEHOLDER_SYMBOLS.length];
    /* 序号补齐到三位，保证 id 与生成顺序一致 */
    const serial = String(index + 1).padStart(3, "0");

    works.push({
      id: `sticker_demo_${serial}`,
      name: PLACEHOLDER_PHRASES[(index * 7) % PLACEHOLDER_PHRASES.length],
      description: `${character.name}的占位示例条目，用于演示连续向下浏览。`,
      characterId: character.id,
      tags: tagA === tagB ? [tagA] : [tagA, tagB],
      format,
      isAnimated: format === "gif" || format === "apng",
      width,
      height,
      fileSize: 120000 + ((index * 7919) % 900000),
      submitter: { name: submitter, github: submitter },
      origin: { type: origins[(index * 2) % origins.length], author: submitter, sourceUrl: null, note: "占位数据" },
      license: { type: licenses[(index * 3) % licenses.length] },
      /* 日期统一早于手写作品，排序不会和真实条目交叠 */
      createdAt: new Date(Date.UTC(2026, 8, 2, 9, 50) - index * 7 * 3600 * 1000).toISOString(),
      tone: character.id,
      symbol
    });
  }
  return works;
}

stickers.push(...generatePlaceholderWorks(PLACEHOLDER_TOTAL));

/* 补全由流水线生成的字段（MIME、状态）。演示作品没有图片文件，因此不写
   path / thumbnailPath，让 artMarkup 直接走无图版式；否则会请求一批
   生产环境不存在的 /previews/*，每张卡片都产生一条 404。 */
stickers.forEach((sticker) => {
  sticker.mimeType = MIME_BY_FORMAT[sticker.format] || "application/octet-stream";
  sticker.status = "published";
  sticker.updatedAt = sticker.createdAt;
});

/* ===========================================================================
   2.1 · 本地首批数据导入
   ---------------------------------------------------------------------------
   staging 里的结果先经过最小收录门槛：必须同时有名称、至少一个 Tag 和角色。
   因此名称或 Tag 不确定的条目仍保留在 staging JSON，但不会出现在本地
   主展示中。预览图只读本地资源，下载原图仍回到上游原始地址。
   =========================================================================== */
let dataMode = "demo";
let localImportSkipped = 0;

function sourceFileName(value) {
  return String(value || "").split("/").pop();
}

function localPreviewPath(record) {
  const filename = sourceFileName(record.previewPath || record.sourcePath);
  return `data/blue-fish/previews/${encodeURIComponent(filename)}`;
}

function rawGithubPath(repo, value) {
  return `https://raw.githubusercontent.com/${repo}/main/${String(value || "").replace(/^\/+/, "")}`;
}

function mapLocalRecord(record, index) {
  const name = String(record.name || "").trim();
  const tags = Array.isArray(record.tags)
    ? record.tags.map((tag) => String(tag || "").trim()).filter(Boolean)
    : [];
  const characterId = String(record.characterId || "").trim();

  /* 不确定名称、Tag 或角色的条目只留在 staging，不进入本地展示主干。 */
  if (!name || !tags.length || !characterId) return null;

  const format = String(record.format || "").toLowerCase();
  const originalPath = String(record.sourcePath || "");
  const sourceUrl = record.sourceUrl || null;
  const id = `sticker_bf_${String(index + 1).padStart(3, "0")}`;
  return {
    id,
    name,
    description: "首批收录自蓝色大肥鱼档案馆的公开清单；单条原作者与授权信息待补充，可在详情页申请署名或删除。",
    characterId,
    tags,
    format,
    isAnimated: format === "gif" || format === "apng",
    width: Number(record.width) || 1,
    height: Number(record.height) || 1,
    fileSize: Number(record.fileSize) || 0,
    submitter: { name: "上游清单导入", github: "" },
    origin: {
      type: "internet-found",
      author: "",
      sourceUrl,
      note: "从公开上游清单导入；单条原作者信息待补充"
    },
    license: { type: "unknown" },
    createdAt: "2026-09-15T00:00:00+08:00",
    tone: characterId,
    symbol: "",
    mimeType: MIME_BY_FORMAT[format] || "application/octet-stream",
    path: rawGithubPath(CONFIG.upstreamRepo, originalPath),
    thumbnailPath: localPreviewPath(record),
    /* 详情预览也保持本地，原图下载按钮再访问上游原始文件。 */
    fullPath: localPreviewPath(record),
    status: "published",
    updatedAt: "2026-09-15T00:00:00+08:00"
  };
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    return response.ok ? await response.json() : null;
  } catch (error) {
    /* 直接打开 dist/index.html 时 fetch 可能被浏览器拦截，保留演示回退。 */
    return null;
  }
}

async function loadLocalDataset() {
  const [firstBatch, ownerPicks] = await Promise.all([
    fetchJson(CONFIG.localDataUrl),
    fetchJson(CONFIG.ownerPicksDataUrl)
  ]);

  const records = Array.isArray(firstBatch) ? firstBatch : [];
  const imported = records.map(mapLocalRecord).filter(Boolean);
  /* 站长自用清单本身就是 数据契约.md 的正式形状，不需要映射。 */
  const ownerPickRecords = Array.isArray(ownerPicks) ? ownerPicks : [];

  if (!imported.length && !ownerPickRecords.length) return;

  stickers.splice(0, stickers.length, ...imported, ...ownerPickRecords);
  dataMode = "local";
  localImportSkipped = records.length - imported.length;
}

/* ==========================================================================
   3 · 工具
   ========================================================================== */
/* 一次渲染多少个；滑到底部再追加下一批（无限向下加载） */
const PAGE_SIZE = 24;

const state = {
  route: { name: "home" },
  character: "all",
  query: "",
  format: "all",
  sort: "latest",
  randomSeed: 7,
  page: 1,
  drawerOpen: false,
  listIds: null
};

const app = document.querySelector("#app");
const toastRegion = document.querySelector(".toast-region");

const published = () => stickers.filter((sticker) => sticker.status === "published");
const findSticker = (id) => stickers.find((sticker) => sticker.id === id && sticker.status === "published");
const findCharacter = (id) => characters.find((character) => character.id === id);
const characterFor = (id) => findCharacter(id) || characters[0];

function normalize(value) {
  return String(value || "").toLocaleLowerCase("zh-CN").replace(/[\s_\-—–]+/g, "");
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function formatLabel(format) {
  return String(format).toUpperCase();
}

function formatDate(value) {
  return String(value || "").slice(0, 10);
}

function ratioStyle(sticker) {
  return `--art-ratio: ${sticker.width} / ${sticker.height}`;
}

function icon(name, size = 16) {
  const spec = ICONS[name];
  const body = typeof spec === "string" ? spec : spec.body;
  const paint = typeof spec === "string"
    ? 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"'
    : 'fill="currentColor" stroke="none"';
  return `<svg class="icon" viewBox="0 0 24 24" width="${size}" height="${size}" ${paint} aria-hidden="true">${body}</svg>`;
}

/* ==========================================================================
   4 · 图标（内联 SVG，不使用 emoji）
   ========================================================================== */
const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20.4 20.4-4.2-4.2"/>',
  download: '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>',
  link: '<path d="M10.5 13.5a4.5 4.5 0 0 0 6.4 0l2-2a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M13.5 10.5a4.5 4.5 0 0 0-6.4 0l-2 2a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2.4"/><path d="M5.5 15.5A2.5 2.5 0 0 1 3 13V5.5A2.5 2.5 0 0 1 5.5 3H13a2.5 2.5 0 0 1 2.5 2.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/>',
  moon: '<path d="M20.2 14.8A8.6 8.6 0 0 1 9.2 3.8a8.6 8.6 0 1 0 11 11Z"/>',
  menu: '<path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  arrowLeft: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  arrowRight: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
  chat: '<path d="M20.5 12a7.5 7.5 0 0 1-7.5 7.5H9L4.5 22v-6.2A7.5 7.5 0 0 1 12 4.5h1a7.5 7.5 0 0 1 7.5 7.5Z"/>',
  image: '<rect x="3" y="4.5" width="18" height="15" rx="2.4"/><circle cx="9" cy="10.5" r="1.6"/><path d="m4.5 17.5 4.4-4.4 3.6 3.6 2.8-2.8 4.7 4.7"/>',
  sparkle: '<path d="M12 3.5l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8Z"/>',
  github: {
    body: '<path d="M12 .7a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.4.7-4.1-1.6-4.1-1.6-.5-1.4-1.3-1.7-1.3-1.7-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.4-5.5-6a4.7 4.7 0 0 1 1.2-3.3c-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0C16.3 5.8 17.3 6 17.3 6c.6 1.6.2 2.9.1 3.2a4.7 4.7 0 0 1 1.2 3.3c0 4.6-2.8 5.7-5.5 6 .4.3.7 1 .7 2v3c0 .3.2.7.8.6A12 12 0 0 0 12 .7Z"/>'
  }
};

/* ==========================================================================
   5 · 视图
   ========================================================================== */

/* --- 作品图 ---
   列表优先使用本地缩略图；详情页使用上游大图地址，避免首批原图进入仓库。 */
function artMarkup(sticker, className = "", mode = "thumb") {
  const character = characterFor(sticker.characterId);
  const imagePath = mode === "full" ? (sticker.fullPath || sticker.thumbnailPath) : sticker.thumbnailPath;
  const alt = `${sticker.name}，${character.name}作品`;
  if (imagePath) {
    return `<div class="sticker-art art-${sticker.tone} ${className}" style="${ratioStyle(sticker)}" role="img" aria-label="${escapeHtml(alt)}">
      <img class="sticker-image" src="${escapeHtml(imagePath)}" width="${sticker.width}" height="${sticker.height}" alt="${escapeHtml(alt)}" loading="${mode === "full" ? "eager" : "lazy"}" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false" />
      <div class="art-copy image-fallback" hidden><span class="art-symbol">${escapeHtml(sticker.symbol || "?")}</span><strong>${escapeHtml(character.name)}</strong><small>${escapeHtml(sticker.name)}</small></div>
    </div>`;
  }
  return `<div class="sticker-art art-${sticker.tone} ${className}" style="${ratioStyle(sticker)}" role="img" aria-label="${escapeHtml(alt)}"><div class="art-copy"><span class="art-symbol">${escapeHtml(sticker.symbol || "?")}</span><strong>${escapeHtml(character.name)}</strong><small>${escapeHtml(sticker.name)}</small></div></div>`;
}

function roleCounts() {
  const counts = { all: published().length };
  characters.forEach((character) => {
    if (character.id !== "all") {
      counts[character.id] = published().filter((sticker) => sticker.characterId === character.id).length;
    }
  });
  return counts;
}

/* 排序用的稳定伪随机权重：随机浏览时不会因为重新渲染而跳动。 */
function randomWeight(id) {
  let hash = state.randomSeed;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 2147483647;
  }
  return hash;
}

function activeFilters() {
  const route = state.route;
  return {
    characterId: route.name === "character" ? route.id : state.character,
    tag: route.name === "tag" ? route.value : "",
    query: state.query,
    format: state.format,
    sort: state.sort
  };
}

function visibleStickers() {
  const filters = activeFilters();
  const query = normalize(filters.query);
  const tag = normalize(filters.tag);

  const result = published().filter((sticker) => {
    const character = characterFor(sticker.characterId);
    const haystack = normalize([
      sticker.name, sticker.description, ...sticker.tags,
      character.name, ...character.aliases, sticker.submitter.name
    ].join(" "));
    const matchQuery = !query || haystack.includes(query);
    const matchTag = !tag || sticker.tags.some((item) => normalize(item) === tag);
    const matchCharacter = filters.characterId === "all" || sticker.characterId === filters.characterId;
    const matchFormat = filters.format === "all" || sticker.format === filters.format;
    return matchQuery && matchTag && matchCharacter && matchFormat;
  });

  switch (filters.sort) {
    case "oldest": result.sort((a, b) => a.createdAt.localeCompare(b.createdAt)); break;
    case "name": result.sort((a, b) => a.name.localeCompare(b.name, "zh-CN")); break;
    case "name-desc": result.sort((a, b) => b.name.localeCompare(a.name, "zh-CN")); break;
    case "size": result.sort((a, b) => b.fileSize - a.fileSize); break;
    case "random": result.sort((a, b) => randomWeight(a.id) - randomWeight(b.id)); break;
    default: result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return result;
}

function roleButtons() {
  const counts = roleCounts();
  return characters.map((character) => `
    <button type="button" class="role-button ${activeFilters().characterId === character.id ? "is-selected" : ""}" data-role="${escapeHtml(character.id)}">
      <span>${escapeHtml(character.name)}</span>
      <span class="role-count">${counts[character.id]}</span>
    </button>`).join("");
}

function drawerMarkup() {
  return `<div class="drawer-scrim" data-action="close-drawer"></div>
    <aside class="role-drawer" aria-label="按角色筛选">
      <div class="drawer-head">
        <h2>按角色浏览</h2>
        <button type="button" class="icon-button" data-action="close-drawer" aria-label="关闭角色菜单">${icon("close", 18)}</button>
      </div>
      <div class="role-list">${roleButtons()}</div>
    </aside>`;
}

function toolbarMarkup(list) {
  const formatOptions = ["all", "png", "jpg", "gif", "webp", "apng"]
    .map((format) => `<option value="${format}" ${state.format === format ? "selected" : ""}>${format === "all" ? "全部格式" : formatLabel(format)}</option>`)
    .join("");
  const sortOptions = SORT_OPTIONS
    .map((option) => `<option value="${option.value}" ${state.sort === option.value ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
    .join("");
  const shown = Math.min(list.length, state.page * PAGE_SIZE);

  return `
    <div class="toolbar">
      <button type="button" class="button ghost small drawer-trigger" data-action="open-drawer">
        ${icon("menu", 15)}角色
      </button>
      <label class="search-field">
        <span class="sr-only">搜索作品</span>
        ${icon("search", 17)}
        <input class="field" id="searchInput" type="search" autocomplete="off"
          placeholder="搜索名称、Tag、角色或描述" value="${escapeHtml(state.query)}" />
        <button type="button" class="search-clear ${state.query ? "is-visible" : ""}" data-action="clear-search" aria-label="清空搜索">${icon("close", 14)}</button>
      </label>
      <label class="select-wrap">
        <span class="sr-only">筛选格式</span>
        <select class="select" id="formatSelect">${formatOptions}</select>
      </label>
      <label class="select-wrap">
        <span class="sr-only">排序方式</span>
        <select class="select" id="sortSelect">${sortOptions}</select>
      </label>
      <span class="toolbar-count">已显示 ${shown} / ${list.length} 张</span>
    </div>`;
}

function cardMarkup(sticker) {
  const character = characterFor(sticker.characterId);
  const label = `${sticker.name}，${character.name}，${formatLabel(sticker.format)}，查看详情`;
  return `
    <a class="sticker-card" href="#/work/${encodeURIComponent(sticker.id)}" aria-label="${escapeHtml(label)}">
      <div class="card-visual">
        ${artMarkup(sticker)}
        <div class="card-badges">
          <span class="badge">${formatLabel(sticker.format)}</span>
          ${sticker.isAnimated ? '<span class="badge animated">动图</span>' : ""}
        </div>
        <div class="card-actions">
          <button type="button" class="icon-button on-art" data-action="download" data-sticker-id="${escapeHtml(sticker.id)}" title="下载原图" aria-label="下载 ${escapeHtml(sticker.name)}">${icon("download", 16)}</button>
        </div>
      </div>
      <div class="card-body">
        <h2 class="card-title">${escapeHtml(sticker.name)}</h2>
        <p class="card-byline">
          <span class="avatar art-${sticker.tone}" aria-hidden="true"><img src="favicon.png" alt="" /></span>
          <span class="card-character">${escapeHtml(character.name)}</span>
          <span class="card-spec">${sticker.width}×${sticker.height}</span>
        </p>
        <div class="tag-line">${sticker.tags.slice(0, 3).map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join("")}</div>
      </div>
    </a>`;
}

function galleryIntro() {
  const formats = new Set(published().map((sticker) => sticker.format));
  const roleTotal = characters.filter((character) => character.id !== "all").length;
  const localNote = dataMode === "local" && localImportSkipped
    ? `<p class="meta-line">首批收录 · 另有 ${localImportSkipped} 条名称或 Tag 待确认，暂不展示</p>`
    : "";
  return `
    <header class="page-head">
      <h1>蓝色大肥鱼</h1>
      <p class="page-desc">收集不同 AI 角色的二创表情包，按角色归档、按 Tag 检索。</p>
      <p class="meta-line">${published().length} 张作品<span class="sep">·</span>${roleTotal} 个角色<span class="sep">·</span>${formats.size} 种格式</p>
      ${localNote}
    </header>`;
}

function contextHeader(route) {
  if (route.name === "character") {
    const character = findCharacter(route.id);
    if (!character) return "";
    const count = published().filter((sticker) => sticker.characterId === character.id).length;
    const aliases = character.aliases.length ? `别名 ${character.aliases.map(escapeHtml).join(" / ")}<span class="sep">·</span>` : "";
    return `
      <nav class="breadcrumb" aria-label="面包屑">
        <a href="#/">全部作品</a><span class="sep" aria-hidden="true">/</span><span>角色</span>
      </nav>
      <header class="context-header">
        <h1>${escapeHtml(character.name)}</h1>
        <p class="meta-line">${aliases}收录 ${count} 张作品</p>
      </header>`;
  }
  if (route.name === "tag") {
    const count = published().filter((sticker) => sticker.tags.some((tag) => normalize(tag) === normalize(route.value))).length;
    return `
      <nav class="breadcrumb" aria-label="面包屑">
        <a href="#/">全部作品</a><span class="sep" aria-hidden="true">/</span><span>Tag</span>
      </nav>
      <header class="context-header">
        <h1>#${escapeHtml(route.value)}</h1>
        <p class="meta-line">收录 ${count} 张带此 Tag 的作品</p>
      </header>`;
  }
  return galleryIntro();
}

function filterChips() {
  const chips = [];
  if (activeFilters().tag) chips.push({ label: `Tag：${activeFilters().tag}`, href: "#/" });
  if (state.format !== "all") chips.push({ label: `格式：${formatLabel(state.format)}`, href: null, action: "reset-format" });
  if (!chips.length) return "";
  return `<div class="filter-bar"><span class="meta-line">当前筛选</span>${chips.map((chip) => chip.href
    ? `<a class="tag" href="${chip.href}">${escapeHtml(chip.label)} ${icon("close", 11)}</a>`
    : `<button type="button" class="tag" data-action="${chip.action}">${escapeHtml(chip.label)} ${icon("close", 11)}</button>`).join("")}</div>`;
}

function galleryMarkup(route) {
  const header = contextHeader(route);
  if (!header) return notFoundMarkup();
  const list = visibleStickers();
  /* 详情页的上一张 / 下一张跟着整个筛选结果走，而不是只看已加载的部分 */
  state.listIds = list.map((sticker) => sticker.id);

  return `
    <div class="gallery-layout">
      <aside class="role-sidebar" aria-label="按角色筛选">
        <h2 class="sidebar-title">按角色浏览</h2>
        <div class="role-list">${roleButtons()}</div>
        <p class="sidebar-note">共 ${published().length} 张作品 · ${characters.length - 1} 个角色</p>
      </aside>
      <section class="gallery-main">
        ${header}
        ${toolbarMarkup(list)}
        ${filterChips()}
        ${list.length
          ? `<div class="masonry" id="masonry"></div>${feedFooterMarkup(list)}`
          : `<div class="empty-state">${icon("search", 34)}<h2>没有找到匹配的作品</h2><p>换个关键词，或清空筛选条件再看看。</p></div>`}
      </section>
    </div>
    ${state.drawerOpen ? drawerMarkup() : ""}`;
}

/* 列表底部：还有内容就放哨兵，滑到就加载；到底了给一句结束语 */
function feedFooterMarkup(list) {
  const shownCount = Math.min(list.length, state.page * PAGE_SIZE);
  if (shownCount >= list.length) {
    return `<p class="feed-end">已经到底了 · 共 ${list.length} 张</p>`;
  }
  return `<p class="feed-more" id="feedSentinel" role="status">继续向下滑动，加载更多</p>`;
}

/* ---------------------------------------------------------------------------
   瀑布流投放：卡片走 JS 放到「当前最矮的一列」，而不是用 CSS multi-column。
   多列布局在追加内容时会重新平衡，已渲染的卡片会跳到别的列（实测 24 张里有
   18 张会位移），滚动时体验很差。这里只在最矮列的末尾插节点，已有卡片不动。
   列数读 CSS 变量 --card-min / --columns-max，断点仍然只写在样式表里。
   卡片高度用「缩略图高度（按真实宽高比换算）+ 信息区高度」估算，误差只影响
   各列的均衡，不影响正确性。
   --------------------------------------------------------------------------- */
/* 卡片信息区实测约 107px（单行标题）～130px（两行标题），取中间值估算即可 */
const CARD_BODY_HEIGHT = 112;
const columnHeights = new Map();

function masonryColumns(container) {
  const existing = [...container.querySelectorAll(".masonry-column")];
  if (existing.length) return existing;

  const styles = getComputedStyle(container);
  const gap = parseFloat(styles.columnGap) || 16;
  const min = parseFloat(styles.getPropertyValue("--card-min")) || 196;
  const max = parseInt(styles.getPropertyValue("--columns-max"), 10) || 4;
  const width = container.clientWidth || min;
  const count = Math.max(1, Math.min(max, Math.floor((width + gap) / (min + gap))));

  const columns = [];
  for (let index = 0; index < count; index += 1) {
    const column = document.createElement("div");
    column.className = "masonry-column";
    columns.push(column);
  }
  container.append(...columns);
  container.dataset.columnWidth = String((width - gap * (count - 1)) / count);
  return columns;
}

function appendToMasonry(container, works) {
  if (!container || !works.length) return;
  const columns = masonryColumns(container);
  const gap = parseFloat(getComputedStyle(container).columnGap) || 16;
  const columnWidth = parseFloat(container.dataset.columnWidth) || 240;

  works.forEach((sticker) => {
    let target = columns[0];
    let shortest = columnHeights.get(target) ?? 0;
    columns.forEach((column) => {
      const height = columnHeights.get(column) ?? 0;
      if (height < shortest) {
        target = column;
        shortest = height;
      }
    });
    target.insertAdjacentHTML("beforeend", cardMarkup(sticker));
    /* 缩略图高度 = 列宽 / 宽高比 */
    columnHeights.set(target, shortest + (columnWidth * sticker.height) / sticker.width + CARD_BODY_HEIGHT + gap);
  });
}

let feedObserver = null;
let feedScrollBound = false;
let feedResizeTimer = 0;
/* 提前这么多像素就开始加载下一批，滑到底不会看到空白 */
const FEED_MARGIN = 900;

function teardownFeed() {
  feedObserver?.disconnect();
  feedObserver = null;
  if (feedScrollBound) {
    window.removeEventListener("scroll", checkFeed);
    window.removeEventListener("resize", onFeedResize);
    feedScrollBound = false;
    window.clearTimeout(feedResizeTimer);
  }
}

/* 兜底检查：IntersectionObserver 在部分内嵌 / 后台渲染环境里回调会延迟，
   所以再挂一个滚动检查，两种触发都指向同一个幂等的加载函数 */
function checkFeed() {
  const sentinel = document.querySelector("#feedSentinel");
  if (!sentinel) return;
  if (sentinel.getBoundingClientRect().top < window.innerHeight + FEED_MARGIN) loadNextPage();
}

/* 视口宽度变了就重排一次（列数/列宽都变了），防抖即可 */
function onFeedResize() {
  window.clearTimeout(feedResizeTimer);
  feedResizeTimer = window.setTimeout(() => {
    if (document.querySelector("#masonry")) render();
  }, 200);
}

function setupFeed() {
  teardownFeed();
  const masonry = document.querySelector("#masonry");
  if (!masonry) return;

  /* 已渲染的卡片按当前页数铺进列里 */
  const list = visibleStickers();
  columnHeights.clear();
  delete masonry.dataset.columnWidth;
  appendToMasonry(masonry, list.slice(0, state.page * PAGE_SIZE));

  const sentinel = document.querySelector("#feedSentinel");
  if (sentinel && typeof IntersectionObserver === "function") {
    feedObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadNextPage();
    }, { rootMargin: `${FEED_MARGIN}px 0px` });
    feedObserver.observe(sentinel);
  }

  window.addEventListener("scroll", checkFeed, { passive: true });
  window.addEventListener("resize", onFeedResize);
  feedScrollBound = true;
  checkFeed();
}

/* 追加下一批卡片：只往瀑布流后面塞节点，不整页重渲染，滚动位置不受影响 */
function loadNextPage() {
  const list = visibleStickers();
  const loaded = state.page * PAGE_SIZE;
  if (loaded >= list.length) {
    teardownFeed();
    return;
  }

  state.page += 1;
  appendToMasonry(document.querySelector("#masonry"), list.slice(loaded, state.page * PAGE_SIZE));

  const shownCount = Math.min(list.length, state.page * PAGE_SIZE);
  const counter = document.querySelector(".toolbar-count");
  if (counter) counter.textContent = `已显示 ${shownCount} / ${list.length} 张`;

  if (shownCount >= list.length) {
    document.querySelector("#feedSentinel")?.remove();
    document.querySelector(".gallery-main")?.insertAdjacentHTML("beforeend", `<p class="feed-end">已经到底了 · 共 ${list.length} 张</p>`);
    teardownFeed();
  }
}

/* --- 作品详情页 --- */
function workContext(sticker) {
  if (state.listIds && state.listIds.includes(sticker.id)) return state.listIds;
  return published()
    .filter((item) => item.characterId === sticker.characterId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((item) => item.id);
}

function metaRow(label, value) {
  return `<div class="meta-row"><dt>${escapeHtml(label)}</dt><dd>${value}</dd></div>`;
}

function sourceLink(sticker) {
  if (!sticker.origin.sourceUrl) return '<span class="muted">未提供（可不填）</span>';
  return `<a href="${escapeHtml(sticker.origin.sourceUrl)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(sticker.origin.sourceUrl)}</a>`;
}

/* 相关作品：同角色 → 同 Tag → 兜底补最新作品，保证区块不出现空洞 */
function relatedStickers(sticker) {
  const others = published().filter((item) => item.id !== sticker.id);
  const related = [];
  const rest = [];
  others.forEach((item) => {
    const sameCharacter = item.characterId === sticker.characterId;
    const sameTag = item.tags.some((tag) => sticker.tags.includes(tag));
    (sameCharacter || sameTag ? related : rest).push(item);
  });
  rest.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { items: [...related, ...rest].slice(0, 6), exact: related.length > 0 };
}

function workMarkup(id) {
  const sticker = findSticker(id);
  if (!sticker) return notFoundMarkup();

  const character = characterFor(sticker.characterId);
  const context = workContext(sticker);
  const index = context.indexOf(sticker.id);
  const prevId = index > 0 ? context[index - 1] : null;
  const nextId = index > -1 && index < context.length - 1 ? context[index + 1] : null;
  const related = relatedStickers(sticker);
  const relatedTitle = related.exact ? "相关作品" : "更多作品";
  const aliases = character.aliases.length ? character.aliases.join(" / ") : "—";
  const dimensionText = `${sticker.width} × ${sticker.height} px`;
  const motionText = sticker.isAnimated ? "动态图片" : "静态图片";
  const originLabel = ORIGIN_LABELS[sticker.origin.type] || sticker.origin.type;
  const licenseLabel = LICENSE_LABELS[sticker.license.type] || sticker.license.type;

  return `
    <article class="work-page">
      <nav class="breadcrumb" aria-label="面包屑">
        <a href="#/">全部作品</a>
        <span class="sep" aria-hidden="true">/</span>
        <a href="#/character/${encodeURIComponent(character.id)}">${escapeHtml(character.name)}</a>
        <span class="sep" aria-hidden="true">/</span>
        <span>${escapeHtml(sticker.name)}</span>
      </nav>

      <div class="work-layout">
        <section class="work-stage" aria-label="作品预览">
          <div class="stage-nav">
            ${prevId
              ? `<a class="stage-arrow" href="#/work/${encodeURIComponent(prevId)}" aria-label="上一张作品">${icon("arrowLeft", 17)}</a>`
              : `<span class="stage-arrow is-disabled" aria-hidden="true">${icon("arrowLeft", 17)}</span>`}
            <span class="stage-counter">${index > -1 ? index + 1 : 1} / ${context.length}</span>
            ${nextId
              ? `<a class="stage-arrow" href="#/work/${encodeURIComponent(nextId)}" aria-label="下一张作品">${icon("arrowRight", 17)}</a>`
              : `<span class="stage-arrow is-disabled" aria-hidden="true">${icon("arrowRight", 17)}</span>`}
            <span class="stage-hint">方向键 ← → 可翻页</span>
          </div>
          <div class="stage-canvas">
            <div class="stage-art" style="${ratioStyle(sticker)}">${artMarkup(sticker, "", "full")}</div>
          </div>
          <div class="stage-foot">
            <button type="button" class="button small" data-action="download" data-sticker-id="${escapeHtml(sticker.id)}">${icon("download", 15)}下载原图</button>
            <button type="button" class="button ghost small" data-action="copy-link">${icon("link", 15)}复制链接</button>
            <span class="stage-note">${formatLabel(sticker.format)} · ${formatSize(sticker.fileSize)} · ${dimensionText}</span>
          </div>
        </section>

        <aside class="work-sidebar" aria-label="作品信息">
          <div>
            <h1 class="work-title">${escapeHtml(sticker.name)}</h1>
            <p class="work-caption">${escapeHtml(sticker.description)}</p>
          </div>

          <div class="work-actions">
            <button type="button" class="button" data-action="download" data-sticker-id="${escapeHtml(sticker.id)}">${icon("download", 15)}下载原图</button>
            <button type="button" class="button ghost" data-action="copy-link">${icon("link", 15)}复制链接</button>
          </div>

          <div class="author-row">
            <span class="avatar large art-${sticker.tone}" aria-hidden="true"><img src="favicon.png" alt="" /></span>
            <div>
              <p class="author-name">${escapeHtml(character.name)}</p>
              <p class="author-sub">别名 ${escapeHtml(aliases)}</p>
            </div>
            <a class="author-link" href="#/character/${encodeURIComponent(character.id)}">全部作品</a>
          </div>

          <div>
            <h2 class="section-label">作品信息</h2>
            <dl class="meta-rows">
              ${metaRow("名称", escapeHtml(sticker.name))}
              ${metaRow("角色", `<a href="#/character/${encodeURIComponent(character.id)}">${escapeHtml(character.name)}</a>`)}
              ${metaRow("格式", `${formatLabel(sticker.format)} · ${motionText}`)}
              ${metaRow("尺寸", dimensionText)}
              ${metaRow("体积", formatSize(sticker.fileSize))}
              ${metaRow("提交者", sticker.submitter.github
                ? `${escapeHtml(sticker.submitter.name)} <span class="muted">@${escapeHtml(sticker.submitter.github)}</span>`
                : escapeHtml(sticker.submitter.name))}
              ${metaRow("来源类型", escapeHtml(originLabel))}
              ${metaRow("来源作者", sticker.origin.author ? escapeHtml(sticker.origin.author) : '<span class="muted">未标注</span>')}
              ${metaRow("来源链接", sourceLink(sticker))}
              ${metaRow("授权状态", escapeHtml(licenseLabel))}
              ${metaRow("收录时间", formatDate(sticker.createdAt))}
            </dl>
          </div>

          <div>
            <h2 class="section-label">Tag</h2>
            <div class="tag-line">
              ${sticker.tags.map((tag) => `<a class="tag" href="#/tag/${encodeURIComponent(tag)}">#${escapeHtml(tag)}</a>`).join("")}
            </div>
          </div>

          <p class="license-note">
            <strong>图片来源与授权：</strong>${escapeHtml(originLabel)}${sticker.origin.note ? `（${escapeHtml(sticker.origin.note)}）` : ""}。
            版权归原作者所有。作者可
            <a href="${issueUrl("takedown-request.yml", `[署名/删除] ${sticker.name}`)}" target="_blank" rel="noopener noreferrer nofollow">提交 Issue 申请署名、修改信息或删除</a>。
          </p>
        </aside>

        ${related.items.length ? `
        <section class="related" aria-labelledby="relatedTitle">
          <div class="section-head">
            <h2 id="relatedTitle">${relatedTitle}</h2>
            <a href="#/character/${encodeURIComponent(character.id)}">查看 ${escapeHtml(character.name)} 的全部作品</a>
          </div>
          <div class="related-grid">${related.items.map(cardMarkup).join("")}</div>
        </section>` : ""}
      </div>

      ${commentsMarkup(sticker)}
    </article>`;
}

function notFoundMarkup() {
  return `
    <div class="work-page">
      <div class="empty-state">
        ${icon("image", 34)}
        <h1>没有找到这个页面</h1>
        <p>作品可能已撤下，或链接输入有误。</p>
        <p class="action-row"><a class="button" href="#/">返回全部作品</a></p>
      </div>
    </div>`;
}

/* --- 关于本站 --- */
/* 文档页章节：slug 同时作为 #/about/<slug> 深链和锚点 id */
const ABOUT_SECTIONS = [
  { slug: "range", title: "收录范围" },
  { slug: "fields", title: "作品信息" },
  { slug: "license", title: "来源与授权" },
  { slug: "submit", title: "如何投稿" },
  { slug: "copyright", title: "版权与删除" },
  { slug: "faq", title: "常见问题" },
  { slug: "site", title: "关于本站" }
];

/* 深链落到章节：滚动过去并把左侧目录对应项标为当前 */
function scrollToDocSection(slug) {
  const target = document.getElementById(`doc-${slug}`);
  if (!target) return;
  target.scrollIntoView({ block: "start" });
  document.querySelectorAll(".doc-nav-link").forEach((link) => {
    link.classList.toggle("is-current", link.dataset.slug === slug);
  });
}

function aboutMarkup(slug) {
  const counts = roleCounts();
  const formats = new Set(published().map((sticker) => sticker.format));
  const characterChips = characters
    .filter((character) => character.id !== "all")
    .map((character) => `
      <a class="chip art-${character.id}" href="#/character/${encodeURIComponent(character.id)}">
        <span class="avatar" aria-hidden="true"><img src="favicon.png" alt="" /></span>${escapeHtml(character.name)}
        <span class="role-count">${counts[character.id]}</span>
      </a>`).join("");

  const docNav = ABOUT_SECTIONS.map((section) => `
    <a class="doc-nav-link ${section.slug === slug ? "is-current" : ""}" data-slug="${section.slug}"
       href="#/about/${section.slug}">${escapeHtml(section.title)}</a>`).join("");

  const originRows = Object.keys(ORIGIN_LABELS).map((code) => `
    <div><dt><code>${code}</code></dt><dd>${escapeHtml(ORIGIN_LABELS[code])}</dd></div>`).join("");

  const licenseRows = Object.keys(LICENSE_LABELS).map((code) => `
    <div><dt><code>${code}</code></dt><dd>${escapeHtml(LICENSE_LABELS[code])}</dd></div>`).join("");

  const fieldRows = [
    ["name", "作品名称，列表和详情页的标题"],
    ["characterId", "所属角色的 ID，决定作品归档到哪个角色"],
    ["tags", "自由填写的 Tag，只用于检索，不生成分类按钮"],
    ["format / isAnimated", "图片格式，以及是否为动态图（GIF、APNG）"],
    ["width / height", "像素尺寸，用于生成列表的等比占位"],
    ["fileSize", "文件体积，可直接按体积排序"],
    ["submitter", "提交者名称与 GitHub 用户名"],
    ["origin", "来源类型、来源作者、来源链接（可不填）"],
    ["license", "授权状态，投稿时必须确认"],
    ["createdAt", "首次收录时间"]
  ].map(([code, text]) => `<div><dt><code>${escapeHtml(code)}</code></dt><dd>${escapeHtml(text)}</dd></div>`).join("");

  return `
    <div class="doc-layout">
      <aside class="doc-side">
        <p class="doc-side-title">关于本站</p>
        <nav class="doc-nav" aria-label="本页目录">${docNav}</nav>
      </aside>

      <article class="doc-body">
        <header class="doc-head">
          <h1>关于本站</h1>
          <p>蓝色大肥鱼是一个开放的 AI 娘二创表情包档案：作品按角色归档，支持模糊搜索、原图下载与作品评论，内容全部通过 GitHub 投稿和维护。</p>
          <p class="meta-line">${published().length} 张作品<span class="sep">·</span>${characters.length - 1} 个角色<span class="sep">·</span>${formats.size} 种格式<span class="sep">·</span>0 后端依赖</p>
        </header>

        <section class="doc-section" id="doc-range">
          <h2>收录范围</h2>
          <p>本站收集各家 AI 产品拟人化角色的二创表情包。同一个角色的名称可能变化，图片只记录角色 ID，所以搜索别名同样能找到作品。</p>
          <div class="chip-row">${characterChips}</div>
          <h3>收录</h3>
          <ul class="doc-list">
            <li>角色拟人化二创：表情包、聊天配图、状态图。</li>
            <li>静态与动态图片，格式支持 PNG、JPG、GIF、WebP、APNG。</li>
            <li>自己创作或生成、以及获得原作者许可的作品。</li>
          </ul>
          <h3>不收录</h3>
          <ul class="doc-list">
            <li>真人肖像、未授权的商业素材、与 AI 角色无关的通用表情包。</li>
            <li>含违法、仇恨或骚扰内容的图片。</li>
          </ul>
        </section>

        <section class="doc-section" id="doc-fields">
          <h2>作品信息</h2>
          <p>每张作品都带一组固定字段。这些字段既用于展示，也用于搜索和重复检测，字段定义写在仓库的 <strong>数据契约.md</strong> 里。</p>
          <dl class="spec-list">${fieldRows}</dl>
        </section>

        <section class="doc-section" id="doc-license">
          <h2>来源与授权</h2>
          <p>来源链接不是必填项：自己生成或没有公开出处的内容也能投稿。授权状态则需要投稿时明确选择。</p>
          <h3>来源类型</h3>
          <dl class="spec-list">${originRows}</dl>
          <h3>授权类型</h3>
          <dl class="spec-list">${licenseRows}</dl>
        </section>

        <section class="doc-section" id="doc-submit">
          <h2>如何投稿</h2>
          <ol class="steps">
            <li><strong>准备图片。</strong>确认自己有权投稿，或已获得原作者许可。</li>
            <li><strong>打开投稿表单。</strong>点下面的按钮，直接进到本仓库的「表情包投稿」Issue 表单。</li>
            <li><strong>逐项填写。</strong>角色、内容来源和授权状态都在下拉里选，图片拖进「图片文件」框即可。</li>
            <li><strong>等待审核。</strong>自动校验（格式、体积、重复文件）通过后进入待审，维护者确认后上线。</li>
          </ol>
          <p class="meta-line">表单会收集：名称、一句话说明、角色、Tag、图片文件、内容来源、来源作者、来源链接、授权状态与授权说明。</p>
          <div class="action-row">
            <button type="button" class="button" data-action="submit">${icon("github", 16)}前往 GitHub 投稿</button>
            <a class="button ghost" href="#/">返回浏览作品</a>
          </div>
        </section>

        <section class="doc-section" id="doc-copyright">
          <h2>版权与删除</h2>
          <p>本站是非官方同人整理项目，与各 AI 产品官方无关。图片版权归原作者所有，本站只做索引与展示。</p>
          <p>如果你是作者，可以要求<strong>署名、修改信息或删除作品</strong>：<a href="${issueUrl("takedown-request.yml", "[署名/删除] ")}" target="_blank" rel="noopener noreferrer nofollow">提交「署名与删除申请」</a>。发现来源标注或授权状态有问题，同样走这个模板。收到有效的版权投诉时，会先下架作品再核实来源。</p>
          <p>其它问题可以用<a href="${issueUrl()}" target="_blank" rel="noopener noreferrer nofollow">Issue 模板选择页</a>。</p>
        </section>

        <section class="doc-section" id="doc-faq">
          <h2>常见问题</h2>
          <div class="faq">
            <details class="faq-item">
              <summary>可以直接转载站里的图片吗？</summary>
              <div class="faq-body"><p>看每张作品详情页的授权状态。标注「原作者明确授权」或 CC 协议的作品按对应条款使用；标注「授权状态不明」的作品请先联系原作者，不要直接商用。</p></div>
            </details>
            <details class="faq-item">
              <summary>为什么没有点赞、收藏和排行榜？</summary>
              <div class="faq-body"><p>本站是静态档案，不统计浏览量、点赞、收藏、下载量，也不计算热度分。所有作品按最新收录、名称或体积排序，随机浏览用来发现冷门作品，避免热度集中。</p></div>
            </details>
            <details class="faq-item">
              <summary>怎么找某个 Tag 的图片？</summary>
              <div class="faq-body"><p>点作品详情页里的任意 Tag，或直接在搜索框输入关键词。搜索会同时匹配名称、描述、Tag、角色名和角色别名，不区分大小写。</p></div>
            </details>
            <details class="faq-item">
              <summary>列表能一直往下滑吗？</summary>
              <div class="faq-body"><p>可以。列表按批次加载，滑到底部会自动补上下一批，一直滑到全部作品为止，末尾会显示总数。</p></div>
            </details>
            <details class="faq-item">
              <summary>评论区需要注册吗？会不会泄露信息？</summary>
              <div class="faq-body"><p>评论由 GitHub Discussions 托管，需要 GitHub 账号登录后发言。本站不保存任何评论数据，也不加载统计或追踪脚本。</p></div>
            </details>
            <details class="faq-item">
              <summary>作品图看起来还是占位图？</summary>
              <div class="faq-body"><p>${dataMode === "local" ? "首批真实图片已经接入，列表与详情页读的都是本站自己托管的资源；少量条目因名称或 Tag 待确认暂不展示。每张作品详情页会标明来源类型与授权状态，授权状态为「不明」时表示原作者信息尚未核实。" : "目前展示的是根据角色与尺寸生成的占位示例图，用于先把版式和数据跑通。接入真实图片后，前端结构不需要改动，只替换图片资源即可。"}</p></div>
            </details>
          </div>
        </section>

        <section class="doc-section" id="doc-site">
          <h2>关于本站</h2>
          <p>本站是纯静态站点：没有后端、没有数据库、没有追踪脚本，可以直接托管在任意静态空间。评论由第三方服务承载，不写入本站数据。</p>
          <p>样式由 <strong>tokens.css</strong> 的设计 Token 统一驱动，支持深色与浅色两套主题；页面结构、数据字段和投稿说明都在仓库里公开维护。</p>
          <div class="action-row">
            <button type="button" class="button ghost" data-action="submit">${icon("github", 16)}查看仓库</button>
            <a class="button quiet" href="#/">回到作品列表</a>
          </div>
        </section>
      </article>
    </div>`;
}

/* ==========================================================================
   6 · 评论区（静态站方案：第三方托管，无需自建服务器）
   --------------------------------------------------------------------------
   默认接 Giscus（基于 GitHub Discussions，免费、无服务器、支持深浅色）。
   填好 CONFIG.comments.giscus 四项后自动生效，未填则显示占位说明。
   注意：hash 路由下 pathname 对所有作品都相同，所以必须用 mapping=specific
   + term=sticker:<id>，否则所有作品会共用同一个讨论串。
   ========================================================================== */
function commentsConfigured() {
  const { provider, giscus } = CONFIG.comments;
  return provider === "giscus" && Boolean(giscus.repo && giscus.repoId && giscus.categoryId);
}

function commentsMarkup(sticker) {
  const configured = commentsConfigured();
  return `
    <section class="comments" id="comments" aria-labelledby="commentsTitle">
      <div class="comments-head">
        <h2 id="commentsTitle">评论</h2>
        <p>${configured ? "由 GitHub Discussions 托管，需登录 GitHub 账号发言" : "静态站点，评论将由第三方服务加载"}</p>
      </div>
      <div class="comments-body" id="commentsMount">
        ${configured ? "" : `
        <div class="comments-notice">
          <span class="notice-icon">${icon("chat", 22)}</span>
          <h3>评论功能尚未开启</h3>
          <p>本站是纯静态站点，评论不需要自己的服务器。维护者在 <code>app.js</code> 里填好评论服务参数后，这里会自动出现评论区。</p>
          <details class="dev-note">
            <summary>维护者注：三步开启 Giscus 评论</summary>
            <ol>
              <li>把一个公开仓库的 Discussions 打开，并安装 <code>giscus</code> App。</li>
              <li>在 <code>giscus.app</code> 填仓库、Discussion 分类（建议 Announcements），拿到 <code>repoId</code> 与 <code>categoryId</code>。</li>
              <li>把四项填进 <code>CONFIG.comments.giscus</code>，并把 <code>provider</code> 设为 <code>"giscus"</code>。详细步骤与其它方案见 README.md。</li>
            </ol>
          </details>
        </div>`}
      </div>
    </section>`;
}

let giscusScript = null;

function mountComments(sticker) {
  if (!commentsConfigured()) return;
  const mount = document.querySelector("#commentsMount");
  if (!mount) return;

  const { giscus } = CONFIG.comments;
  const script = document.createElement("script");
  script.src = "https://giscus.app/client.js";
  script.async = true;
  script.crossOrigin = "anonymous";
  script.setAttribute("data-repo", giscus.repo);
  script.setAttribute("data-repo-id", giscus.repoId);
  script.setAttribute("data-category", giscus.category);
  script.setAttribute("data-category-id", giscus.categoryId);
  script.setAttribute("data-mapping", "specific");
  script.setAttribute("data-term", `sticker-${sticker.id}`);
  script.setAttribute("data-strict", "0");
  script.setAttribute("data-reactions-enabled", giscus.reactionsEnabled ? "1" : "0");
  script.setAttribute("data-emit-metadata", "0");
  script.setAttribute("data-input-position", giscus.inputPosition);
  script.setAttribute("data-theme", currentTheme() === "light" ? "light" : "dark_dimmed");
  script.setAttribute("data-lang", "zh-CN");
  script.setAttribute("data-loading", "lazy");
  mount.appendChild(script);
  giscusScript = script;
}

function unmountComments() {
  giscusScript?.remove();
  giscusScript = null;
  document.querySelector("#commentsMount")?.replaceChildren();
}

function syncGiscusTheme() {
  const frame = document.querySelector("iframe.giscus-frame");
  if (!frame?.contentWindow) return;
  frame.contentWindow.postMessage(
    { giscus: { setConfig: { theme: currentTheme() === "light" ? "light" : "dark_dimmed" } } },
    "https://giscus.app"
  );
}

/* ==========================================================================
   7 · 交互
   ========================================================================== */
function currentTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function updateThemeButtons() {
  const theme = currentTheme();
  document.querySelectorAll('[data-action="toggle-theme"]').forEach((button) => {
    button.innerHTML = icon(theme === "light" ? "moon" : "sun", 17);
    button.setAttribute("aria-label", theme === "light" ? "切换到深色主题" : "切换到浅色主题");
    button.setAttribute("title", theme === "light" ? "切换到深色主题" : "切换到浅色主题");
  });
}

function setTheme(theme, persist = true) {
  document.documentElement.dataset.theme = theme;
  if (persist) {
    try { localStorage.setItem(CONFIG.theme.storageKey, theme); } catch (error) { /* 隐私模式忽略 */ }
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#ffffff" : "#16181c");
  updateThemeButtons();
  syncGiscusTheme();
}

function toggleTheme() {
  setTheme(currentTheme() === "light" ? "dark" : "light");
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toastRegion.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3200);
}

function navigate(hash) {
  if (window.location.hash === hash) {
    render();
    return;
  }
  window.location.hash = hash;
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) { /* 回退到 execCommand */ }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;top:-1000px;opacity:0";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (error) { ok = false; }
  area.remove();
  return ok;
}

function downloadSticker(id) {
  const sticker = findSticker(id);
  if (!sticker) return;
  const fileUrl = sticker.path || sticker.fullPath || sticker.thumbnailPath;
  if (!fileUrl) {
    showToast("演示作品没有原图文件，接入真实数据后才能下载。");
    return;
  }
  const anchor = document.createElement("a");
  anchor.href = fileUrl;
  anchor.download = `${sticker.name}.${sticker.format}`;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  showToast(`已开始下载「${sticker.name}」原图`);
}

/* Issue 模板直链。模板在仓库 .github/ISSUE_TEMPLATE/ 下；不传 template 时打开模板选择页。 */
function issueUrl(template, title) {
  const base = `${CONFIG.repositoryUrl.replace(/\/$/, "")}/issues/new`;
  if (!template) return `${base}/choose`;
  const params = new URLSearchParams({ template });
  if (title) params.set("title", title);
  return `${base}?${params}`;
}

function goSubmit() {
  if (!CONFIG.repositoryUrl) {
    showToast("仓库地址尚未配置：在 app.js 的 CONFIG.repositoryUrl 填入后即可跳转投稿。");
    return;
  }
  window.open(issueUrl("sticker-submission.yml", "[投稿] "), "_blank", "noopener");
}

async function copyCurrentLink() {
  const ok = await copyText(window.location.href);
  showToast(ok ? "作品链接已复制" : "复制失败，请手动复制地址栏链接");
}

/* --- 事件 --- */
document.addEventListener("click", (event) => {
  const actionTarget = event.target.closest("[data-action]");
  const roleTarget = event.target.closest("[data-role]");

  if (actionTarget) {
    const { action } = actionTarget.dataset;
    if (action !== "toggle-theme") event.preventDefault();

    switch (action) {
      case "download":
        event.stopPropagation();
        downloadSticker(actionTarget.dataset.stickerId);
        return;
      case "copy-link":
        copyCurrentLink();
        return;
      case "submit":
        goSubmit();
        return;
      case "toggle-theme":
        toggleTheme();
        return;
      case "open-drawer":
        state.drawerOpen = true;
        render();
        return;
      case "close-drawer":
        state.drawerOpen = false;
        render();
        return;
      case "clear-search":
        state.query = "";
        state.page = 1;
        render();
        document.querySelector("#searchInput")?.focus();
        return;
      case "reset-format":
        state.format = "all";
        state.page = 1;
        render();
        return;
      default:
        break;
    }
  }

  if (roleTarget) {
    const id = roleTarget.dataset.role;
    state.drawerOpen = false;
    navigate(id === "all" ? "#/" : `#/character/${encodeURIComponent(id)}`);
    return;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.drawerOpen) {
    state.drawerOpen = false;
    render();
    return;
  }

  if (state.route.name !== "work") return;
  if (event.target.closest("input, textarea, select")) return;
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

  const label = event.key === "ArrowLeft" ? "上一张作品" : "下一张作品";
  const link = document.querySelector(`.stage-arrow[aria-label="${label}"]`);
  if (!link) return;
  event.preventDefault();
  window.location.hash = link.getAttribute("href");
});

document.addEventListener("input", (event) => {
  if (event.target.id !== "searchInput") return;
  state.query = event.target.value;
  state.page = 1;
  render();
  const input = document.querySelector("#searchInput");
  if (input) {
    input.focus();
    input.setSelectionRange(state.query.length, state.query.length);
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "formatSelect") {
    state.format = event.target.value;
    state.page = 1;
    render();
    return;
  }
  if (event.target.id === "sortSelect") {
    state.sort = event.target.value;
    if (state.sort === "random") state.randomSeed = Math.floor(Math.random() * 2147483647);
    state.page = 1;
    render();
  }
});

window.addEventListener("hashchange", () => {
  state.route = readRoute();
  state.drawerOpen = false;
  state.page = 1;
  render();
  /* 文档页深链已经在 render 里滚到对应章节，不要再拉回顶部 */
  if (!(state.route.name === "about" && state.route.slug)) {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  app.focus({ preventScroll: true });
});

/* ==========================================================================
   8 · 启动
   ========================================================================== */
function readRoute() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const segments = raw.split("/").filter(Boolean).map((part) => {
    try { return decodeURIComponent(part); } catch (error) { return part; }
  });
  const [head, tail] = segments;
  if (!head) return { name: "home" };
  if (head === "about") return { name: "about", slug: tail || "" };
  if (head === "work" && tail) return { name: "work", id: tail };
  if (head === "character" && tail) return { name: "character", id: tail };
  if (head === "tag" && tail) return { name: "tag", value: tail };
  return { name: "home" };
}

function syncNav() {
  document.querySelectorAll("[data-route-link]").forEach((link) => {
    const routeName = link.dataset.routeLink;
    const active = (routeName === "home" && (state.route.name === "home" || state.route.name === "character" || state.route.name === "tag"))
      || routeName === state.route.name;
    link.classList.toggle("is-active", active);
  });
}

function syncTitle() {
  const route = state.route;
  if (route.name === "work") {
    const sticker = findSticker(route.id);
    document.title = sticker ? `${sticker.name} · ${characterFor(sticker.characterId).name} · ${CONFIG.siteName}` : `未找到作品 · ${CONFIG.siteName}`;
    return;
  }
  if (route.name === "about") { document.title = `关于本站 · ${CONFIG.siteName}`; return; }
  if (route.name === "character") {
    const character = findCharacter(route.id);
    document.title = character ? `${character.name} 的作品 · ${CONFIG.siteName}` : CONFIG.siteName;
    return;
  }
  if (route.name === "tag") { document.title = `#${route.value} · ${CONFIG.siteName}`; return; }
  document.title = `${CONFIG.siteName} · 表情包开放档案`;
}

function render() {
  unmountComments();
  teardownFeed();
  const route = state.route;

  if (route.name === "about") app.innerHTML = aboutMarkup(route.slug || "");
  else if (route.name === "work") app.innerHTML = workMarkup(route.id);
  else if (route.name === "character" && !findCharacter(route.id)) app.innerHTML = notFoundMarkup();
  else app.innerHTML = galleryMarkup(route);

  syncNav();
  syncTitle();
  document.body.classList.toggle("is-locked", state.drawerOpen);
  if (route.name === "work") {
    const sticker = findSticker(route.id);
    if (sticker) mountComments(sticker);
  } else if (route.name !== "about") {
    setupFeed();
  }
  if (route.name === "about" && route.slug) scrollToDocSection(route.slug);
}

state.route = readRoute();
setTheme(currentTheme(), false);
updateThemeButtons();
/* 先等本地首批数据落地再首屏渲染：反过来的话会先把演示数据画出来再整表替换，
   既闪一次列表，也让用户刚发生的滚动失效。 */
loadLocalDataset().then(render);
