#!/usr/bin/env node
/* tools/intake/cli.mjs —— 收录中转的命令行入口
 *
 *   node tools/intake/cli.mjs add <图片...> --character deepseek --name "..." [--tags a,b]
 *                             [--description "..."] [--target dist/submissions/originals/deepseek/x.png]
 *   INTAKE_API_URL=http://127.0.0.1:8787 INTAKE_API_TOKEN="$INTAKE_API_TOKEN" \
 *   node tools/intake/cli.mjs upload <图片...> --character deepseek --name "..."
 *   node tools/intake/cli.mjs pull-issues [--issue 7] [--state open]
 *   node tools/intake/cli.mjs list [--status staged] [--source github-issue] [--json]
 *   node tools/intake/cli.mjs show <sha256>
 *   node tools/intake/cli.mjs export <sha256> --out ./review
 *   node tools/intake/cli.mjs verify [--status staged]     只读：报告哪些能清理
 *   node tools/intake/cli.mjs prune [--apply]              默认只报告，--apply 才删
 *   node tools/intake/cli.mjs drop <sha256> --reason "重复投稿"
 *
 * 配置走环境变量，避免把服务器路径写进仓库：
 *   INTAKE_ROOT、INTAKE_CONTENT_DIR、INTAKE_GITHUB_REPO、INTAKE_GITHUB_TOKEN、INTAKE_REF
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  addLocalFile,
  dropItem,
  exportItem,
  listItems,
  pruneItems,
  pullIssueAttachments,
  readItem,
  resolveConfig,
  verifyItems,
} from './core.mjs';

function parseArgs(argv) {
  const options = {};
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        options[key] = true;
      } else {
        options[key] = next;
        i += 1;
      }
    } else {
      positional.push(arg);
    }
  }
  return { options, positional };
}

function die(message) {
  console.error(`× ${message}`);
  process.exit(1);
}

function splitTags(value) {
  if (!value || value === true) return [];
  return String(value).split(/[\s,，、]+/).filter(Boolean);
}

function human(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fieldsFrom(options) {
  const fields = {};
  if (options.name && options.name !== true) fields.name = options.name;
  if (options.description && options.description !== true) fields.description = options.description;
  if (options.character && options.character !== true) fields.character = options.character;
  if (options.tags) fields.tags = splitTags(options.tags);
  if (options['origin-author']) fields.originAuthor = options['origin-author'];
  if (options['origin-url']) fields.originUrl = options['origin-url'];
  if (options['origin-type']) fields.originType = options['origin-type'];
  if (options['license-type']) fields.licenseType = options['license-type'];
  if (options['license-note']) fields.licenseNote = options['license-note'];
  return fields;
}

function relative(file, cfg) {
  const rel = path.relative(cfg.contentDir, file);
  return rel.startsWith('..') ? file : rel.split(path.sep).join('/');
}

function apiOption(options, key, envKey) {
  const value = options[key] && options[key] !== true ? options[key] : process.env[envKey];
  if (!value) die(`upload 需要 --${key} 或 ${envKey}`);
  return value;
}

function apiUrlWithQuery(base, params) {
  const url = new URL('/api/v1/items', base.endsWith('/') ? base : `${base}/`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  return url;
}

async function uploadToApi(file, options) {
  const apiUrl = apiOption(options, 'api-url', 'INTAKE_API_URL');
  const token = apiOption(options, 'token', 'INTAKE_API_TOKEN');
  const buffer = await fs.readFile(file);
  const fields = fieldsFrom(options);
  const url = apiUrlWithQuery(apiUrl, {
    filename: path.basename(file),
    name: fields.name,
    description: fields.description,
    character: fields.character,
    tags: fields.tags ? fields.tags.join(',') : '',
    target: options.target && options.target !== true ? options.target : '',
    'origin-type': fields.originType,
    'origin-author': fields.originAuthor,
    'origin-url': fields.originUrl,
    'license-type': fields.licenseType,
    'license-note': fields.licenseNote,
    source: 'local',
  });
  const response = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
    body: buffer,
  });
  let payload = null;
  try { payload = await response.json(); } catch { payload = { error: await response.text() }; }
  if (!response.ok) throw new Error(`API ${response.status}：${payload.error || JSON.stringify(payload)}`);
  return payload;
}

const commands = {
  async add(cfg, { options, positional }) {
    if (positional.length === 0) die('add 需要至少一个图片路径');
    const fields = fieldsFrom(options);
    const targetPath = options.target && options.target !== true ? options.target : null;
    let failures = 0;
    for (const file of positional) {
      try {
        const result = await addLocalFile(cfg, file, { fields, targetPath });
        if (result.status === 'duplicate') {
          console.log(`= 已有同图（sha256 ${result.sha256.slice(0, 12)}），未重复收录  ${file}`);
        } else if (result.status === 'published') {
          console.log(`√ 已在 ${cfg.ref} 发布（sha256 ${result.sha256.slice(0, 12)}）  ${file}`);
        } else {
          console.log(`+ ${result.sha256.slice(0, 12)}  ${human(result.item.bytes)}  ${file}`);
        }
      } catch (error) {
        failures += 1;
        console.error(`× ${file}：${error.message}`);
      }
    }
    console.log(`\n中转区  ${cfg.root}`);
    if (failures > 0) process.exitCode = 1;
  },

  async upload(cfg, { options, positional }) {
    if (positional.length === 0) die('upload 需要至少一个图片路径');
    let failures = 0;
    for (const file of positional) {
      try {
        const result = await uploadToApi(file, options);
        const mark = result.status === 'staged' ? '+' : '√';
        console.log(`${mark} ${result.status || 'ok'}  ${String(result.sha256 || '').slice(0, 12)}  ${human(result.bytes || 0)}  ${file}`);
      } catch (error) {
        failures += 1;
        console.error(`× ${file}：${error.message}`);
      }
    }
    if (failures > 0) process.exitCode = 1;
  },

  async 'pull-issues'(cfg, { options }) {
    const issue = options.issue && options.issue !== true ? Number(options.issue) : null;
    const results = await pullIssueAttachments(cfg, {
      issue,
      state: options.state && options.state !== true ? options.state : 'open',
    });
    let staged = 0;
    let duplicate = 0;
    let failed = 0;
    for (const entry of results) {
      if (entry.status === 'staged') {
        staged += 1;
        console.log(`+ #${entry.issue}  ${entry.sha256.slice(0, 12)}  ${human(entry.item.bytes)}  ${entry.item.fields.name || ''}`);
      } else if (entry.status === 'duplicate' || entry.status === 'published') {
        duplicate += 1;
        console.log(`= #${entry.issue}  ${entry.status === 'published' ? '已在 main 发布' : '已有同图'}（sha256 ${entry.sha256.slice(0, 12)}）`);
      } else {
        failed += 1;
        console.error(`× #${entry.issue}  ${entry.error}`);
      }
    }
    console.log(`\n新收 ${staged} 张，重复 ${duplicate} 张，失败 ${failed} 张`);
    if (failed > 0) process.exitCode = 1;
    if (cfg.token === '') {
      console.log('提示：未配 INTAKE_GITHUB_TOKEN，走匿名接口，每小时只有 60 次配额。');
    }
  },

  async list(cfg, { options }) {
    const items = await listItems(cfg, {
      status: options.status && options.status !== true ? options.status : undefined,
      source: options.source && options.source !== true ? options.source : undefined,
    });
    if (options.json) {
      console.log(JSON.stringify(items, null, 2));
      return;
    }
    if (items.length === 0) {
      console.log('中转区是空的。');
      return;
    }
    console.log(`${'sha256'.padEnd(14)}${'来源'.padEnd(14)}${'大小'.padEnd(9)}名字 / 角色`);
    for (const item of items) {
      const name = item.fields.name || '(未填名字)';
      const character = item.fields.character ? ` · ${item.fields.character}` : '';
      console.log(
        `${item.sha256.slice(0, 12).padEnd(14)}${String(item.source).padEnd(14)}`
        + `${human(item.bytes).padEnd(9)}${name}${character}`,
      );
    }
    console.log(`\n共 ${items.length} 条  ·  中转区 ${cfg.root}`);
  },

  async show(cfg, { positional }) {
    if (!positional[0]) die('show 需要 sha256');
    const item = await readItem(cfg, positional[0]);
    if (!item) die(`中转区里没有 ${positional[0]}`);
    console.log(JSON.stringify(item, null, 2));
  },

  async export(cfg, { options, positional }) {
    if (!positional[0]) die('export 需要 sha256');
    const outDir = options.out && options.out !== true ? options.out : './review';
    const file = await exportItem(cfg, positional[0], outDir);
    console.log(`已导出 ${file}`);
  },

  async verify(cfg, { options }) {
    const reports = await verifyItems(cfg, {
      status: options.status && options.status !== true ? options.status : undefined,
    });
    if (reports.length === 0) {
      console.log('没有待校验的中转记录。');
      return;
    }
    for (const entry of reports) {
      const mark = entry.prunable ? '√' : '·';
      console.log(`${mark} ${entry.sha256.slice(0, 12)}  ${entry.prunable ? '可清理' : '保留  '}  ${entry.reason}`);
    }
    const prunable = reports.filter((entry) => entry.prunable).length;
    console.log(`\n可清理 ${prunable} 条，保留 ${reports.length - prunable} 条。`);
    if (prunable > 0) console.log('确认无误后执行：node tools/intake/cli.mjs prune --apply');
  },

  async prune(cfg, { options }) {
    const apply = options.apply === true || String(options.apply).toLowerCase() === 'true';
    const result = await pruneItems(cfg, { apply });
    if (result.prunable.length === 0) {
      console.log(`没有可清理的记录，保留 ${result.kept.length} 条。`);
      return;
    }
    for (const entry of result.applied ? result.removed : result.prunable) {
      console.log(`${apply ? '−' : '·'} ${entry.sha256.slice(0, 12)}  ${entry.reason}`);
    }
    console.log(
      apply
        ? `\n已删除 ${result.removed.length} 条中转副本；保留 ${result.kept.length} 条（未通过回源校验或拿不准）。`
        : `\n以上 ${result.prunable.length} 条可清理（当前是报告模式，未删任何文件）。加 --apply 才执行。`,
    );
  },

  async drop(cfg, { options, positional }) {
    if (!positional[0]) die('drop 需要 sha256');
    const reason = options.reason && options.reason !== true ? options.reason : '';
    const item = await dropItem(cfg, positional[0], reason);
    console.log(`已丢弃 ${positional[0].slice(0, 12)}  ${item.fields.name || ''}`);
  },

  help() {
    console.log(`收录中转 · 可用命令

  add <图片...>        把本地图片收进当前机器的中转区（按 sha256 查重）
  upload <图片...>     通过内部 API 把本地图片传到服务器中转区
  pull-issues          拉取带 sticker-submission 标签的 Issue 附件
  list                 列出中转记录
  show <sha256>        打印一条记录的完整信息
  export <sha256>      把原图导出到本地看图
  verify               只读：回源校验哪些已经进 main、可以清理
  prune [--apply]      清理已验证入库的中转副本（默认只报告）
  drop <sha256>        人工丢弃一条记录（审核不通过）

配置走环境变量：INTAKE_ROOT / INTAKE_CONTENT_DIR / INTAKE_GITHUB_REPO
                INTAKE_GITHUB_TOKEN / INTAKE_REF`);
  },
};

const { options, positional } = parseArgs(process.argv.slice(2));
const command = positional.shift() || 'help';
if (options.help || command === 'help' || command === '--help') {
  commands.help();
  process.exit(0);
}

const action = commands[command];
if (!action) die(`未知命令 ${command}（node tools/intake/cli.mjs help 看可用命令）`);

const cfg = resolveConfig();
try {
  await action(cfg, { options, positional });
} catch (error) {
  die(error.message);
}
