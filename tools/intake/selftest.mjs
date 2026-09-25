#!/usr/bin/env node
/* tools/intake/selftest.mjs —— 收录中转的自测
 *
 *   node tools/intake/selftest.mjs
 *
 * 重点验证那条要命的性质：**清理只删已确实进 main 的记录，绝不误删。**
 * 用真实的 contentDir（要能读到 origin/main）跑，中转区落在系统临时目录，
 * 不碰仓库工作树。零依赖，只用 Node 内置模块。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import {
  addLocalFile,
  dropItem,
  pullIssueAttachments,
  itemFile,
  listItems,
  pruneItems,
  readItem,
  resolveConfig,
  sniffImageFormat,
  stageBuffer,
  verifyItems,
} from './core.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REF = 'origin/main';

/* 一个真的 1x1 PNG，用来造「没进过 main」的样本 */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64',
);

let passed = 0;
function check(label, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  √ ${label}`);
  } catch (error) {
    console.error(`  × ${label}\n    ${error.message}`);
    process.exitCode = 1;
  }
}

function trackedBlob(repoPath) {
  return execFileSync('git', ['-C', REPO_ROOT, 'cat-file', 'blob', `${REF}:${repoPath}`]);
}

function firstTracked(prefix) {
  const out = execFileSync('git', ['-C', REPO_ROOT, 'ls-tree', '-r', '--name-only', REF, prefix], { encoding: 'utf8' });
  return out.split('\n').filter(Boolean)[0];
}

async function main() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'intake-selftest-'));
  const cfg = resolveConfig({ contentDir: REPO_ROOT, root, ref: REF });

  console.log(`中转区 ${root}`);
  console.log(`内容仓 ${REPO_ROOT}（校验基准 ${REF}）\n`);
  assert.throws(
    () => resolveConfig({ contentDir: REPO_ROOT, root: path.join(REPO_ROOT, 'staging', 'intake') }),
    /不能位于内容仓库内/,
  );
  check('中转根目录不能落在内容仓库内', () => {});

  /* ---- 样本 ---- */
  const committedOriginal = firstTracked('dist/submissions/originals');
  const committedBlueFish = firstTracked('blue-fish-originals');
  assert.ok(committedOriginal, '需要至少一条已提交的投稿原图');
  assert.ok(committedBlueFish, '需要至少一条已提交的首批原图');

  console.log('1) 入库与查重');
  const a = await addLocalFile(cfg, path.join(REPO_ROOT, committedBlueFish), {
    fields: { name: '已入库的首批图', character: 'deepseek' },
    targetPath: committedBlueFish,
  });
  check('新图入库为 staged', () => assert.equal(a.status, 'staged'));

  const aAgain = await addLocalFile(cfg, path.join(REPO_ROOT, committedBlueFish), {
    fields: { name: '已入库的首批图' },
    targetPath: committedBlueFish,
  });
  check('同图再入库判为 duplicate', () => assert.equal(aAgain.status, 'duplicate'));
  check('查重不产生第二条记录', async () => {});

  const b = await stageBuffer(cfg, await fs.readFile(path.join(REPO_ROOT, committedOriginal)), {
    source: 'local',
    fields: { name: '已入库的投稿原图' },
    targetPath: null, // 已发布图由入口查重直接返回 published，不再制造暂存副本
    name: path.basename(committedOriginal),
  });
  check('同图不同路径但已在清单里，直接判为 published', () => assert.equal(b.status, 'published'));

  const c = await stageBuffer(cfg, TINY_PNG, {
    source: 'local',
    fields: { name: '新图，目标路径还没提交' },
    targetPath: 'dist/submissions/originals/deepseek/__intake_selftest__.png',
    name: 'new-thing.png',
  });
  const d = await stageBuffer(cfg, Buffer.concat([TINY_PNG, Buffer.from([0])]), {
    source: 'local',
    fields: { name: '新图，完全没线索' },
    name: 'orphan.png',
  });
  check('合成样本入库成功', () => {
    assert.equal(c.status, 'staged');
    assert.equal(d.status, 'staged');
  });

  const all = await listItems(cfg);
  check('共 3 条待梳理记录（已发布图不进中转）', () => assert.equal(all.length, 3));

  console.log('\n2) 最小 Issue 字段兼容');
  const issueAssetUrl = 'https://github.com/user-attachments/assets/123e4567-e89b-12d3-a456-426614174000';
  let issueDownloads = 0;
  const issueFetch = async (url) => {
    if (url.endsWith('/issues/999')) {
      return new Response(JSON.stringify({
        number: 999,
        title: '[投稿] 最小字段',
        html_url: 'https://github.com/lmy414/ai-girl-stickers/issues/999',
        user: { login: 'selftest' },
        body: `### 图片名称\n\n最小字段图\n\n### 一句话说明（可选）\n\n仅测试图片和角色\n\n### 角色\n\nDeepSeek娘（deepseek · 别名 蓝色大肥鱼）\n\n### 图片文件\n\n![image](${issueAssetUrl})\n\n### 确认\n\n- [x] 已确认`
      }), { status: 200 });
    }
    if (url === issueAssetUrl) {
      issueDownloads += 1;
      return new Response(TINY_PNG, { status: 200, headers: { 'content-length': String(TINY_PNG.length) } });
    }
    throw new Error(`自测收到意外 URL：${url}`);
  };
  const issueCfg = resolveConfig({
    contentDir: REPO_ROOT,
    root: path.join(root, 'minimal-issue'),
    apiBase: 'https://selftest.invalid',
    fetchImpl: issueFetch,
  });
  const firstIssue = await pullIssueAttachments(issueCfg, { issue: 999 });
  const secondIssue = await pullIssueAttachments(issueCfg, { issue: 999 });
  check('最小 Issue 字段仍能暂存附件', () => assert.equal(firstIssue[0].status, 'staged'));
  const issueItems = await listItems(issueCfg);
  check('缺少 Tag/来源/授权时字段保持空值', () => {
    assert.equal(issueItems.length, 1);
    assert.equal(issueItems[0].fields.name, '最小字段图');
    assert.equal(issueItems[0].fields.character, 'deepseek');
    assert.deepEqual(issueItems[0].fields.tags, []);
    assert.equal(issueItems[0].fields.originType, undefined);
    assert.equal(issueItems[0].fields.licenseType, undefined);
  });
  check('最小 Issue 重复拉取不重复下载', () => {
    assert.equal(secondIssue[0].status, 'duplicate');
    assert.equal(issueDownloads, 1);
  });

  console.log('\n3) 格式校验');
  check('认得出 PNG 头', () => assert.equal(sniffImageFormat(TINY_PNG), 'png'));
  check('认不出非图片字节', () => assert.equal(sniffImageFormat(Buffer.alloc(32)), null));
  await assert.rejects(
    () => stageBuffer(cfg, Buffer.from('PK\u0003\u0004 not an image'), { source: 'local', name: 'fake.png' }),
    /不是已知图片格式/,
  );
  check('改名的非图片被拒绝入库', () => {});
  await assert.rejects(
    () => stageBuffer(cfg, TINY_PNG, { source: 'local', name: 'x.png', targetPath: '../outside.png' }),
    /targetPath 只能落在原图目录/,
  );
  check('目标路径穿越被拒绝', () => {});
  await assert.rejects(
    () => stageBuffer(resolveConfig({ contentDir: REPO_ROOT, root: path.join(root, 'size'), maxBytes: 4 }), TINY_PNG, { source: 'local', name: 'x.png' }),
    /超过大小上限/,
  );
  check('超过大小上限被拒绝', () => {});

  console.log('\n4) 回源校验');
  const reports = await verifyItems(cfg);
  const byDigest = new Map(reports.map((entry) => [entry.sha256, entry]));

  check('目标路径已在 main 上 -> 可清理', () => {
    const entry = byDigest.get(a.sha256);
    assert.equal(entry.prunable, true, entry.reason);
  });
  check('已发布图不在中转报告里', () => assert.equal(byDigest.has(b.sha256), false));
  check('目标路径尚未提交 -> 不可清理', () => {
    const entry = byDigest.get(c.sha256);
    assert.equal(entry.prunable, false);
    assert.match(entry.reason, /都不存在/);
  });
  check('毫无线索 -> 不可清理', () => {
    const entry = byDigest.get(d.sha256);
    assert.equal(entry.prunable, false);
    assert.match(entry.reason, /没有 targetPath/);
  });
  check('可清理恰好 1 条', () => assert.equal(reports.filter((e) => e.prunable).length, 1));

  console.log('\n5) 清理的安全性');
  const dryRun = await pruneItems(cfg, { apply: false });
  check('报告模式不删任何文件', async () => {});
  check('报告模式下列出 1 条', () => assert.equal(dryRun.prunable.length, 1));
  for (const digest of [a.sha256, c.sha256, d.sha256]) {
    assert.ok(await readItem(cfg, digest), `报告模式后 ${digest.slice(0, 8)} 的 meta 应仍在`);
  }
  check('报告模式后 3 条记录都还在', () => {});

  const applied = await pruneItems(cfg, { apply: true });
  check('只删了 1 条', () => assert.equal(applied.removed.length, 1));
  check('保留 2 条', () => assert.equal(applied.kept.length, 2));
  check('已入库的副本被清掉', async () => {});
  check('未入库的副本必须还在（核心性质）', async () => {});
  assert.equal(await readItem(cfg, a.sha256), null, `${a.sha256.slice(0, 8)} 应已删除`);
  for (const digest of [c.sha256, d.sha256]) {
    const item = await readItem(cfg, digest);
    assert.ok(item, `${digest.slice(0, 8)} 绝不能被删`);
    await fs.access(itemFile(cfg, item)); // 原图字节也必须在
  }

  console.log('\n6) 幂等与人工丢弃');
  const again = await pruneItems(cfg, { apply: true });
  check('重复清理不再删任何东西', () => assert.equal(again.removed.length, 0));

  await dropItem(cfg, d.sha256, '自测：人工丢弃');
  check('人工丢弃后记录消失', async () => {});
  check('人工丢弃后只剩 1 条', async () => {});
  assert.equal(await readItem(cfg, d.sha256), null);
  assert.equal((await listItems(cfg)).length, 1);

  await fs.rm(root, { recursive: true, force: true });
  console.log(`\n通过 ${passed} 项检查${process.exitCode ? '（有失败）' : ''}。`);
}

await main();
