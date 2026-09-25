/* tools/intake/core.mjs —— 投稿收录中转的核心逻辑
 *
 * 这里只做一件事：把「还没进仓库的图」放在仓库外面等着被收录。
 * 三个来源（本地上传 / GitHub Issue 附件 / 飞书表单）统一成一条 IntakeItem，
 * 按 sha256 去重，收录并推送之后由 verify + prune 安全清掉。
 *
 * 两条硬规则：
 *
 *   1. **不写 dist/，不写 blue-fish-originals/，不碰工作树。**
 *      id 与 slug 一经发布即冻结、原图路径发布后不能改名，路径是在收录那一刻
 *      由 prepare_works.mjs 定的。中转层只写自己的 root，交接给收录流程。
 *
 *   2. **清理的唯一判据是「回源校验」**，不是时间、不是人工打标记。
 *      删除前先在 origin/main 上把目标 blob 取出来对 sha256，对不上就留着。
 *      见 verifyItems()。原图是本仓库里最不可再生的东西，宁可留下垃圾。
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA = 'intake/1';
export const DEFAULT_MAX_BYTES = 16 * 1024 * 1024;
export const ORIGINAL_PREFIXES = [
  'dist/submissions/originals/',
  'owner-picks/',
  'blue-fish-originals/',
];

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');

/* 允许的图片格式，与投稿表单里写的一致 */
export const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.apng']);
export const ALLOWED_SOURCES = new Set(['local', 'github-issue', 'feishu', 'manual']);

/**
 * 按文件头认格式。HTTP 那层是按裸字节收的，扩展名是投稿者说了算的，
 * 只看扩展名会把改名的 zip / 脚本放进中转区。认不出来就拒绝入库。
 */
export function sniffImageFormat(buffer) {
  if (buffer.length >= 8
    && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('latin1') === 'GIF8') return 'gif';
  if (buffer.length >= 12
    && buffer.subarray(0, 4).toString('latin1') === 'RIFF'
    && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

/* 已发布清单：sha256 -> 记录。作为 targetPath 缺失时的兜底定位。
   blue-fish 批次（上游档案馆）的清单里没有 sha256，只认前两份。 */
const MANIFESTS = [
  { file: 'dist/submissions/works.json', label: 'submissions' },
  { file: 'dist/owner-picks/works.json', label: 'owner-picks' },
];

const GITHUB_API = 'https://api.github.com';

/* ---------------------------------------------------------------- 配置 */

export function resolveConfig(overrides = {}) {
  const env = process.env;
  const contentDir = path.resolve(
    overrides.contentDir || env.INTAKE_CONTENT_DIR || REPO_ROOT,
  );
  const root = path.resolve(
    overrides.root || env.INTAKE_ROOT || path.join(path.dirname(contentDir), 'dafeiyu-intake'),
  );
  const relativeRoot = path.relative(contentDir, root);
  const rootInsideContent = relativeRoot === ''
    || (!relativeRoot.startsWith(`..${path.sep}`) && relativeRoot !== '..' && !path.isAbsolute(relativeRoot));
  if (rootInsideContent) {
    throw new Error(`INTAKE_ROOT 不能位于内容仓库内：${root}`);
  }
  const maxBytes = Number(overrides.maxBytes || env.INTAKE_MAX_BYTES || DEFAULT_MAX_BYTES);
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error(`INTAKE_MAX_BYTES 必须是正整数：${maxBytes}`);
  }
  return {
    contentDir,
    root,
    inboxDir: path.join(root, 'inbox'),
    metaDir: path.join(root, 'meta'),
    logDir: path.join(root, 'logs'),
    repo: overrides.repo || env.INTAKE_GITHUB_REPO || 'lmy414/ai-girl-stickers',
    token: overrides.token || env.INTAKE_GITHUB_TOKEN || env.GITHUB_TOKEN || '',
    ref: overrides.ref || env.INTAKE_REF || 'origin/main',
    apiBase: overrides.apiBase || env.INTAKE_GITHUB_API || GITHUB_API,
    maxBytes,
    fetchImpl: overrides.fetchImpl || globalThis.fetch,
  };
}

/* ---------------------------------------------------------------- 基础工具 */

export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function sha256File(file) {
  return sha256(await fs.readFile(file));
}

export function normalizeExt(name) {
  const ext = path.extname(String(name || '')).toLowerCase();
  return ext === '.jpeg' ? '.jpg' : ext;
}

export function targetPathIsAllowed(value) {
  const raw = String(value || '').replace(/[\\\\]/g, '/');
  if (!raw || raw.startsWith('/') || /^[A-Za-z]:[\\/]/.test(raw)) return false;
  if (raw.split('/').some((segment) => segment === '..')) return false;
  const normalized = path.posix.normalize(raw);
  if (normalized === '.' || normalized === '..' || normalized.startsWith('../')) return false;
  return ORIGINAL_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function normalizeTargetPath(value) {
  if (!targetPathIsAllowed(value)) {
    throw new Error(`targetPath 只能落在原图目录，且不能含绝对路径或 ..：${value}`);
  }
  return path.posix.normalize(String(value).replace(/[\\\\]/g, '/'));
}

function assertDigest(value) {
  const digest = String(value || '');
  if (!/^[0-9a-f]{64}$/.test(digest)) {
    throw new Error(`sha256 必须是 64 位小写十六进制：${digest}`);
  }
  return digest;
}

function extensionHint(name, targetPath) {
  const nameExt = normalizeExt(name);
  const targetExt = normalizeExt(targetPath);
  return nameExt || targetExt;
}

function extensionFromSniffed(format) {
  return { png: '.png', jpeg: '.jpg', gif: '.gif', webp: '.webp' }[format] || '';
}

async function writeBufferAtomic(file, buffer) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.tmp`);
  try {
    await fs.writeFile(temporary, buffer, { mode: 0o600 });
    await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

/* 原子写：先写临时文件再 rename，避免半截 JSON 被后续读到 */
async function writeJsonAtomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.tmp`);
  try {
    await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function git(cfg, args, options = {}) {
  return execFileSync('git', ['-C', cfg.contentDir, ...args], {
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
    ...options,
  });
}

function repoRelative(cfg, absolute) {
  return path.relative(cfg.contentDir, absolute).split(path.sep).join('/');
}

/* intake 自己的路径只由 sha256 决定，永不由投稿者提供的文件名决定 */
export function itemFile(cfg, item) {
  if (!ALLOWED_EXT.has(item.ext)) {
    throw new Error(`中转记录的扩展名非法：${item.ext}`);
  }
  return path.join(cfg.inboxDir, `${assertDigest(item.sha256)}${item.ext}`);
}

export function metaFile(cfg, digest) {
  return path.join(cfg.metaDir, `${assertDigest(digest)}.json`);
}

export async function ensureLayout(cfg) {
  await fs.mkdir(cfg.root, { recursive: true, mode: 0o700 });
  for (const dir of [cfg.inboxDir, cfg.metaDir, cfg.logDir]) {
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    await fs.chmod(dir, 0o700);
  }
  await fs.chmod(cfg.root, 0o700);
}

async function log(cfg, event, detail) {
  await fs.mkdir(cfg.logDir, { recursive: true });
  const line = `${new Date().toISOString()}\t${event}\t${JSON.stringify(detail)}\n`;
  const logFile = path.join(cfg.logDir, 'intake.log');
  await fs.appendFile(logFile, line, { encoding: 'utf8', mode: 0o600 });
  await fs.chmod(logFile, 0o600);
}

async function findByOrigin(cfg, origin) {
  const issue = origin && origin.issue;
  const assetId = origin && origin.assetId;
  if (issue === undefined || issue === null || !assetId) return null;
  for (const item of await listItems(cfg)) {
    if (item.origin && String(item.origin.issue) === String(issue)
      && String(item.origin.assetId) === String(assetId)) return item;
  }
  return null;
}

/* ---------------------------------------------------------------- 写入 */

/**
 * 把一个 Buffer 收进中转区。已存在同 sha256 的记录时直接返回 duplicate，
 * 不再写第二份——这就是「按 sha256 查重」在入库侧的实现。
 */
export async function stageBuffer(cfg, buffer, { source, fields = {}, origin = {}, targetPath = null, name = '' }) {
  await ensureLayout(cfg);
  const originExisting = await findByOrigin(cfg, origin);
  if (originExisting) return { status: 'duplicate', item: originExisting, sha256: originExisting.sha256 };
  if (!ALLOWED_SOURCES.has(source)) {
    throw new Error(`不支持的来源 ${source}，可用值：${[...ALLOWED_SOURCES].join(', ')}`);
  }
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (buffer.length === 0) throw new Error('不能收空文件');
  if (buffer.length > cfg.maxBytes) {
    throw new Error(`图片超过大小上限 ${cfg.maxBytes} 字节：${buffer.length}`);
  }
  if (targetPath) targetPath = normalizeTargetPath(targetPath);

  const digest = sha256(buffer);
  const existing = await readItem(cfg, digest);
  if (existing) return { status: 'duplicate', item: existing, sha256: digest };

  const published = (await buildPublishedIndex(cfg)).get(digest);
  if (published) {
    return { status: 'published', sha256: digest, published };
  }

  const hintedExt = extensionHint(name, targetPath);
  if (hintedExt && !ALLOWED_EXT.has(hintedExt)) {
    throw new Error(`不支持的图片格式 ${hintedExt}：${name}`);
  }

  const sniffed = sniffImageFormat(buffer);
  if (!sniffed) {
    throw new Error(`文件头不是已知图片格式，拒绝入库：${name}`);
  }
  /* GitHub user-attachments URL 常常没有扩展名；有扩展名时才校验一致性。 */
  const expected = hintedExt === '.apng' ? ['png'] : hintedExt ? [hintedExt.slice(1)] : [];
  if (hintedExt === '.jpg') expected.push('jpeg');
  if (expected.length > 0 && !expected.includes(sniffed)) {
    throw new Error(`文件内容像 ${sniffed}，扩展名却是 ${hintedExt}，拒绝入库：${name}`);
  }
  const ext = hintedExt || extensionFromSniffed(sniffed);

  const item = {
    schema: SCHEMA,
    sha256: digest,
    ext,
    bytes: buffer.length,
    source,
    receivedAt: new Date().toISOString(),
    status: 'staged',
    fields: { name: '', description: '', character: '', tags: [], ...fields },
    origin,
    targetPath,
    publishedAt: null,
  };

  await writeBufferAtomic(itemFile(cfg, item), buffer);
  await writeJsonAtomic(metaFile(cfg, digest), item);
  await log(cfg, 'stage', { sha256: digest, source, bytes: buffer.length, targetPath });
  return { status: 'staged', item, sha256: digest };
}

export async function addLocalFile(cfg, file, { fields = {}, targetPath = null } = {}) {
  const buffer = await fs.readFile(file);
  return stageBuffer(cfg, buffer, {
    source: 'local',
    fields,
    origin: { fileName: path.basename(file) },
    targetPath,
    name: path.basename(file),
  });
}

/* ---------------------------------------------------------------- 读取 */

export async function readItem(cfg, digest) {
  const file = metaFile(cfg, digest);
  if (!(await exists(file))) return null;
  return readJson(file);
}

export async function listItems(cfg, { status, source } = {}) {
  await ensureLayout(cfg);
  const entries = await fs.readdir(cfg.metaDir);
  const items = [];
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const item = await readJson(path.join(cfg.metaDir, entry));
    if (status && item.status !== status) continue;
    if (source && item.source !== source) continue;
    items.push(item);
  }
  items.sort((a, b) => String(a.receivedAt).localeCompare(String(b.receivedAt)));
  return items;
}

export async function updateItem(cfg, digest, patch) {
  const item = await readItem(cfg, digest);
  if (!item) throw new Error(`中转区里没有 ${digest}`);
  const next = { ...item, ...patch, fields: { ...item.fields, ...(patch.fields || {}) } };
  await writeJsonAtomic(metaFile(cfg, digest), next);
  return next;
}

/* ---------------------------------------------------------------- GitHub Issue 来源 */

function githubHeaders(cfg) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'blue-fish-intake',
  };
  if (cfg.token) headers.Authorization = `Bearer ${cfg.token}`;
  return headers;
}

/**
 * GitHub Issue 表单渲染出来的正文长这样：
 *
 *   ### 图片名称
 *
 *   不是……而是……大学习
 *
 *   ### 一句话说明（可选）
 *
 *   _No response_
 *
 * 这里按 `### ` 切段还原成 { 标题: 值 }。看不出结构的正文返回空对象，
 * 不猜字段——猜错会写脏收录数据。
 */
export function parseIssueForm(body) {
  const sections = {};
  const text = String(body || '').replace(/\r\n/g, '\n');
  const parts = text.split(/^###[ \t]+/m).slice(1);
  for (const part of parts) {
    const newline = part.indexOf('\n');
    if (newline < 0) continue;
    const label = part.slice(0, newline).trim();
    const value = part.slice(newline + 1).trim();
    sections[label] = /^_No response_$/i.test(value) ? '' : value;
  }
  return sections;
}

const ATTACHMENT_PATTERNS = [
  /https:\/\/github\.com\/user-attachments\/assets\/[0-9a-fA-F-]+/g,
  /https:\/\/user-images\.githubusercontent\.com\/[^\s)"'<>\]]+/g,
  /https:\/\/private-user-images\.githubusercontent\.com\/[^\s)"'<>\]]+/g,
];

export function extractAttachments(body) {
  const text = String(body || '');
  const found = [];
  for (const pattern of ATTACHMENT_PATTERNS) {
    for (const url of text.match(pattern) || []) {
      if (!found.includes(url)) found.push(url);
    }
  }
  return found;
}

export function assetIdOf(url) {
  const assets = String(url).match(/\/user-attachments\/assets\/([0-9a-fA-F-]+)/);
  if (assets) return assets[1];
  const legacy = String(url).match(/user-images\.githubusercontent\.com\/\d+\/([^/]+)\//);
  return legacy ? legacy[1] : String(url);
}

const FIELD_LABELS = {
  图片名称: 'name',
  '一句话说明（可选）': 'description',
  角色: 'character',
  角色补充: 'characterExtra',
  Tag: 'tags',
  内容来源: 'originType',
  来源作者: 'originAuthor',
  来源链接: 'originUrl',
  授权状态: 'licenseType',
  授权说明: 'licenseNote',
};

function fieldsFromSections(sections) {
  const fields = {};
  for (const [label, key] of Object.entries(FIELD_LABELS)) {
    const value = sections[label];
    if (value === undefined || value === '') continue;
    if (key === 'tags') {
      fields[key] = value
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .split(/[\s,，、]+/)
        .filter((tag) => tag && !tag.startsWith('http'));
    } else {
      fields[key] = value;
    }
  }
  return fields;
}

/** 括号里的 characterId，例如「DeepSeek娘（deepseek · 别名 …）」-> deepseek */
function characterIdFromLabel(value) {
  const match = String(value || '').match(/（([a-z0-9_-]+)\s*[·)）]/);
  return match ? match[1] : '';
}

async function githubJson(cfg, url) {
  const response = await cfg.fetchImpl(url, { headers: githubHeaders(cfg) });
  if (!response.ok) {
    throw new Error(`GitHub ${response.status} ${response.statusText}：${url}`);
  }
  return { json: await response.json(), headers: response.headers };
}

async function downloadAttachment(cfg, url) {
  const response = await cfg.fetchImpl(url, { headers: { 'User-Agent': 'blue-fish-intake' } });
  if (!response.ok) {
    throw new Error(`附件下载失败 ${response.status}：${url}`);
  }
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > cfg.maxBytes) {
    throw new Error(`附件超过大小上限 ${cfg.maxBytes} 字节：${url}`);
  }
  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > cfg.maxBytes) throw new Error(`附件超过大小上限 ${cfg.maxBytes} 字节：${url}`);
    return buffer;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > cfg.maxBytes) {
        await reader.cancel();
        throw new Error(`附件超过大小上限 ${cfg.maxBytes} 字节：${url}`);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

/**
 * 把带投稿标签的 Issue 附件拉进中转区。
 * 幂等键是 Issue 号 + 附件 id：重复跑不会重复下载、不产生第二条记录。
 */
export async function pullIssueAttachments(cfg, { issue = null, state = 'open', limit = 100 } = {}) {
  await ensureLayout(cfg);
  const issues = [];

  if (issue !== null && issue !== undefined) {
    const { json } = await githubJson(cfg, `${cfg.apiBase}/repos/${cfg.repo}/issues/${issue}`);
    issues.push(json);
  } else {
    const url = `${cfg.apiBase}/repos/${cfg.repo}/issues`
      + `?state=${encodeURIComponent(state)}&labels=sticker-submission&per_page=${limit}`;
    const { json } = await githubJson(cfg, url);
    issues.push(...json.filter((entry) => !entry.pull_request));
  }

  const results = [];
  for (const entry of issues) {
    const sections = parseIssueForm(entry.body);
    const fields = fieldsFromSections(sections);
    if (fields.character) fields.character = characterIdFromLabel(fields.character) || fields.character;

    for (const url of extractAttachments(entry.body)) {
      const origin = {
        issue: entry.number,
        issueTitle: entry.title,
        issueUrl: entry.html_url,
        submitter: entry.user ? entry.user.login : '',
        assetId: assetIdOf(url),
        assetUrl: url,
      };
      try {
        /* 先按 Issue + asset id 查元数据，重复轮询不重复下载。 */
        const existing = await findByOrigin(cfg, origin);
        if (existing) {
          results.push({ issue: entry.number, url, status: 'duplicate', item: existing, sha256: existing.sha256 });
          continue;
        }
        const buffer = await downloadAttachment(cfg, url);
        const result = await stageBuffer(cfg, buffer, {
          source: 'github-issue',
          fields,
          origin,
          name: path.basename(new URL(url).pathname) || `${assetIdOf(url)}.png`,
        });
        results.push({ issue: entry.number, url, ...result });
      } catch (error) {
        results.push({ issue: entry.number, url, status: 'failed', error: error.message });
      }
    }
  }
  await log(cfg, 'pull-issues', { issues: issues.length, items: results.length });
  return results;
}

/* ---------------------------------------------------------------- 已入库校验 */

/** 从 origin/main 的已发布清单里建 sha256 索引（targetPath 没填时的兜底定位） */
export async function buildPublishedIndex(cfg) {
  const index = new Map();
  for (const { file, label } of MANIFESTS) {
    let raw;
    try {
      raw = git(cfg, ['cat-file', 'blob', `${cfg.ref}:${file}`]).toString('utf8');
    } catch {
      continue;
    }
    for (const record of JSON.parse(raw)) {
      if (record && record.sha256) {
        index.set(record.sha256, {
          manifest: label,
          name: record.name,
          // path 是 Raw 绝对 URL，取 URL 路径部分再剥掉仓库前缀
          path: urlToRepoPath(record.path),
        });
      }
    }
  }
  return index;
}

function urlToRepoPath(rawUrl) {
  const value = String(rawUrl || '');
  if (!value) return '';
  const marker = '/ai-girl-stickers/main/';
  const at = value.indexOf(marker);
  if (at >= 0) return value.slice(at + marker.length);
  return '';
}

/** 取 origin/main 上某个 blob 的 sha256；取不到返回 null */
export function blobDigest(cfg, repoPath) {
  if (!repoPath) return null;
  try {
    return sha256(git(cfg, ['cat-file', 'blob', `${cfg.ref}:${repoPath}`]));
  } catch {
    return null;
  }
}

/**
 * 判断一条中转记录是否已经真的进了 origin/main。
 * 只有返回 prunable: true 的记录才允许被 prune 删除。
 */
export async function verifyItem(cfg, item, index) {
  const candidates = [];
  if (item.targetPath) candidates.push(item.targetPath);

  const published = index.get(item.sha256);
  if (published && published.path) candidates.push(published.path);

  if (candidates.length === 0) {
    return {
      sha256: item.sha256,
      name: item.fields.name || '',
      prunable: false,
      reason: '既没有 targetPath，已发布清单里也没有这个 sha256',
    };
  }

  let mismatch = '';
  for (const candidate of candidates) {
    const digest = blobDigest(cfg, candidate);
    if (digest && digest === item.sha256) {
      return {
        sha256: item.sha256,
        name: item.fields.name || '',
        prunable: true,
        reason: `${cfg.ref}:${candidate} 的 sha256 与中转副本一致`,
        committedPath: candidate,
      };
    }
    if (digest && !mismatch) {
      mismatch = `${candidate} 在 ${cfg.ref} 上存在但 sha256 不一致（图上错位，人工确认）`;
    }
  }

  return {
    sha256: item.sha256,
    name: item.fields.name || '',
    prunable: false,
    reason: mismatch || `${candidates.join(' / ')} 在 ${cfg.ref} 上都不存在`,
  };
}

export async function verifyItems(cfg, { status } = {}) {
  const items = await listItems(cfg, { status: status || 'staged' });
  const index = await buildPublishedIndex(cfg);
  const results = [];
  for (const item of items) results.push(await verifyItem(cfg, item, index));
  return results;
}

/**
 * 清理。默认只报告，必须显式 apply 才删。
 * 删除条件只有一条：verifyItem 判定 prunable。任何拿不准的情况一律保留。
 */
export async function pruneItems(cfg, { apply = false, status } = {}) {
  const reports = await verifyItems(cfg, { status });
  const prunable = reports.filter((entry) => entry.prunable);
  const kept = reports.filter((entry) => !entry.prunable);
  const removed = [];

  if (apply) {
    for (const entry of prunable) {
      const item = await readItem(cfg, entry.sha256);
      await fs.rm(itemFile(cfg, item), { force: true });
      await fs.rm(metaFile(cfg, entry.sha256), { force: true });
      removed.push(entry);
    }
    await log(cfg, 'prune', { removed: removed.map((entry) => entry.sha256) });
  }
  return { applied: apply, prunable, kept, removed };
}

/**
 * 显式丢弃一条记录（审核不通过、重复投稿等）。这是人的决定，不是自动判断，
 * 所以要走单独的命令，不能混在 prune 里。
 */
export async function dropItem(cfg, digest, reason = '') {
  const item = await readItem(cfg, digest);
  if (!item) throw new Error(`中转区里没有 ${digest}`);
  await fs.rm(itemFile(cfg, item), { force: true });
  await fs.rm(metaFile(cfg, digest), { force: true });
  await log(cfg, 'drop', { sha256: digest, reason, name: item.fields.name || '' });
  return item;
}

/** 把中转的原图导出一份到本地，方便审核时看图 */
export async function exportItem(cfg, digest, outDir) {
  const item = await readItem(cfg, digest);
  if (!item) throw new Error(`中转区里没有 ${digest}`);
  await fs.mkdir(outDir, { recursive: true });
  const base = item.fields.name ? sanitizeName(item.fields.name) : digest.slice(0, 12);
  const target = path.join(outDir, `${base}${item.ext}`);
  await fs.copyFile(itemFile(cfg, item), target);
  return target;
}

function sanitizeName(value) {
  return String(value).replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60) || 'item';
}

export { repoRelative };
