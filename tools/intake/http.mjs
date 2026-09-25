#!/usr/bin/env node
/* tools/intake/http.mjs —— 收录中转的管理 API 适配层
 *
 * 这是**站长自用的管理接口，不是站点对外 API**。因此：
 *
 *   1. **只绑回环地址**（默认 127.0.0.1）。所有公开 HTTP 写入口都是攻击面，
 *      这个服务不需要也不应该被公网访问。nginx 不要反代它。
 *   2. **必须配 INTAKE_API_TOKEN**，没配直接拒绝启动——不留一个无鉴权的写端点。
 *   3. 真正的逻辑在 core.mjs，这层只做「HTTP 请求 -> core 调用」的映射。
 *      换传输层（比如以后接浏览器面板）不用动 core。
 *
 * 起法（服务器侧，或本地调试）：
 *   INTAKE_API_TOKEN=$(openssl rand -hex 32) node tools/intake/http.mjs
 * 本地连（建议走 SSH 隧道，别把端口暴露出去）：
 *   ssh -L 8787:127.0.0.1:8787 <server>
 *
 * 接口（全部要求 Authorization: Bearer <token>）：
 *   GET    /api/v1/health
 *   GET    /api/v1/items?status=&source=            列表
 *   GET    /api/v1/items/:sha256                    单条
 *   GET    /api/v1/items/:sha256/raw               原图字节
 *   PUT    /api/v1/items                             上传原图，body 是裸字节
 *                                                   元数据走 query：name/character/tags/description/target
 *   POST   /api/v1/pull-issues                      body: {"issue": 7}（可省略）
 *   GET    /api/v1/verify                           只读：哪些可清理
 *   POST   /api/v1/prune                            body: {"apply": false}
 *   POST   /api/v1/drop                             body: {"sha256": "...", "reason": "..."}
 */
import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import {
  dropItem,
  itemFile,
  listItems,
  pruneItems,
  pullIssueAttachments,
  readItem,
  resolveConfig,
  stageBuffer,
  verifyItems,
} from './core.mjs';

const PORT = Number(process.env.INTAKE_API_PORT || 8787);
const HOST = process.env.INTAKE_API_HOST || '127.0.0.1';
const TOKEN = process.env.INTAKE_API_TOKEN || '';
const MAX_BODY = Number(process.env.INTAKE_MAX_BYTES || 16 * 1024 * 1024);

if (!Number.isSafeInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error(`× INTAKE_API_PORT 必须是 1-65535：${PORT}`);
  process.exit(1);
}
if (!Number.isSafeInteger(MAX_BODY) || MAX_BODY <= 0) {
  console.error(`× INTAKE_MAX_BYTES 必须是正整数：${MAX_BODY}`);
  process.exit(1);
}

if (!TOKEN) {
  console.error('× 没配 INTAKE_API_TOKEN，拒绝启动。');
  console.error('  生成一个：INTAKE_API_TOKEN=$(openssl rand -hex 32) node tools/intake/http.mjs');
  process.exit(1);
}

if (HOST !== '127.0.0.1' && HOST !== '::1' && HOST !== 'localhost') {
  console.error(`× 拒绝把管理 API 绑到 ${HOST}。它只允许监听回环地址，请用 SSH 隧道访问。`);
  process.exit(1);
}

const cfg = resolveConfig();

function json(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function authorized(req) {
  const header = String(req.headers.authorization || '');
  const given = Buffer.from(header.startsWith('Bearer ') ? header.slice(7) : '');
  const expected = Buffer.from(TOKEN);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error(`请求体超过上限 ${MAX_BODY} 字节`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJsonBody(req) {
  const raw = await readBody(req);
  if (raw.length === 0) return {};
  return JSON.parse(raw.toString('utf8'));
}

function fieldsFromQuery(params) {
  const fields = {};
  if (params.get('name')) fields.name = params.get('name');
  if (params.get('description')) fields.description = params.get('description');
  if (params.get('character')) fields.character = params.get('character');
  if (params.get('tags')) fields.tags = params.get('tags').split(/[\s,，、]+/).filter(Boolean);
  if (params.get('origin-type')) fields.originType = params.get('origin-type');
  if (params.get('origin-author')) fields.originAuthor = params.get('origin-author');
  if (params.get('origin-url')) fields.originUrl = params.get('origin-url');
  if (params.get('license-type')) fields.licenseType = params.get('license-type');
  if (params.get('license-note')) fields.licenseNote = params.get('license-note');
  return fields;
}

const routes = [
  {
    method: 'GET',
    pattern: /^\/api\/v1\/health$/,
    async handle(req, res) {
      json(res, 200, {
        ok: true,
        intakeRoot: cfg.root,
        contentDir: cfg.contentDir,
        ref: cfg.ref,
        githubToken: cfg.token ? 'configured' : 'absent',
      });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/v1\/items$/,
    async handle(req, res, params) {
      const items = await listItems(cfg, {
        status: params.get('status') || undefined,
        source: params.get('source') || undefined,
      });
      json(res, 200, { count: items.length, items });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/v1\/items\/([0-9a-f]{64})\/raw$/,
    async handle(req, res, params, match) {
      const item = await readItem(cfg, match[1]);
      if (!item) return json(res, 404, { error: 'not found' });
      const { readFile } = await import('node:fs/promises');
      const buffer = await readFile(itemFile(cfg, item));
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': buffer.length,
        // 中转的原图一律当附件回，绝不让浏览器按 HTML/图片内联解析
        'Content-Disposition': `attachment; filename="${item.sha256.slice(0, 12)}${item.ext}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      });
      res.end(buffer);
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/v1\/items\/([0-9a-f]{64})$/,
    async handle(req, res, params, match) {
      const item = await readItem(cfg, match[1]);
      if (!item) return json(res, 404, { error: 'not found' });
      json(res, 200, item);
    },
  },
  {
    method: 'PUT',
    pattern: /^\/api\/v1\/items$/,
    async handle(req, res, params) {
      const buffer = await readBody(req);
      if (buffer.length === 0) return json(res, 400, { error: '空请求体' });
      const name = params.get('filename') || params.get('name') || '';
      const result = await stageBuffer(cfg, buffer, {
        source: params.get('source') || 'local',
        fields: fieldsFromQuery(params),
        origin: { via: 'api', filename: name },
        targetPath: params.get('target') || null,
        name,
      });
      json(res, result.status === 'staged' ? 201 : 200, {
        status: result.status,
        sha256: result.sha256,
        bytes: result.item ? result.item.bytes : undefined,
        published: result.published || undefined,
      });
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/v1\/pull-issues$/,
    async handle(req, res) {
      const body = await readJsonBody(req);
      const results = await pullIssueAttachments(cfg, {
        issue: body.issue ?? null,
        state: body.state || 'open',
      });
      json(res, 200, {
        staged: results.filter((entry) => entry.status === 'staged').length,
        duplicate: results.filter((entry) => entry.status === 'duplicate').length,
        failed: results.filter((entry) => entry.status === 'failed').length,
        results,
      });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/v1\/verify$/,
    async handle(req, res, params) {
      const reports = await verifyItems(cfg, { status: params.get('status') || undefined });
      json(res, 200, {
        prunable: reports.filter((entry) => entry.prunable).length,
        reports,
      });
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/v1\/prune$/,
    async handle(req, res) {
      const body = await readJsonBody(req);
      const apply = body.apply === true || String(body.apply).toLowerCase() === 'true';
      const result = await pruneItems(cfg, { apply });
      json(res, 200, result);
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/v1\/drop$/,
    async handle(req, res) {
      const body = await readJsonBody(req);
      if (!body.sha256) return json(res, 400, { error: '需要 sha256' });
      const item = await dropItem(cfg, body.sha256, body.reason || '');
      json(res, 200, { dropped: item.sha256, name: item.fields.name || '' });
    },
  },
];

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (!authorized(req)) {
    // 不区分「没带令牌」和「令牌错」，也不回显收到的内容
    res.writeHead(401, { 'WWW-Authenticate': 'Bearer', 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }

  for (const route of routes) {
    if (route.method !== req.method) continue;
    const match = url.pathname.match(route.pattern);
    if (!match) continue;
    try {
      await route.handle(req, res, url.searchParams, match);
    } catch (error) {
      console.error(`× ${req.method} ${url.pathname}: ${error.message}`);
      if (!res.headersSent) json(res, 500, { error: error.message });
    }
    return;
  }
  json(res, 404, { error: 'no such route' });
});

server.listen(PORT, HOST, () => {
  console.log(`收录中转管理 API 监听 http://${HOST}:${PORT}`);
  console.log(`  中转区 ${cfg.root}`);
  console.log(`  内容仓 ${cfg.contentDir}（校验基准 ${cfg.ref}）`);
  console.log('  这是管理接口：只绑回环、要求 Bearer 令牌、不要用 nginx 反代到公网。');
});
