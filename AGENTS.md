# AGENTS.md

给在这个仓库里干活的代理和贡献者看的上手说明。

## 这是什么项目

“蓝色大肥鱼”是 AI 娘二创表情包站。本仓库是它的图片 / 内容 / 投稿仓库，站点源码在 `lmy414/bluedafeiyu`。

这里放：

- 投稿原图 `dist/submissions/originals/`，派生图 `dist/submissions/previews/`、`dist/submissions/large/`；
- 投稿清单与站长自用清单、角色与分类清单、首批数据 `dist/data/`；
- 投稿与下架 Issue 表单 `.github/ISSUE_TEMPLATE/`；
- 内容侧脚本 `tools/`。

线上地址：<https://xn--pssy23gqgbz2d718b.com/>（中文域名一律写 punycode）。

## 文档在哪

历史文档已归档到 `archive/2026-09-24/`：

- `数据契约.md`：字段与枚举的唯一来源；
- `架构边界.md`：分层边界与硬性规则；
- `CONTRIBUTING.md`：投稿与贡献流程；
- `docs/维护与发布.md`：发布拓扑与脚本细节。

归档文档记录的是仓库拆分前的形态。与现状冲突时，以本文件和实际代码为准。

## 投稿怎么走

投稿走 GitHub Issue 表单，投稿者不接触 git：

- 投稿：`sticker-submission.yml`。投稿者只需上传图片、填写图片名称和角色，一句话说明可选；
- 署名 / 删除：`takedown-request.yml`。

维护者收录顺序：按 `sha256` 查重 → 原图入库 → 补至少一个 Tag、分类、来源、授权和正文 → 跑派生图脚本 → 按契约校验 → 置 `published`。

维护者也可以先把本地图片或 GitHub Issue 附件放进**仓库外的收录中转区**，再人工看图和收录：

```bash
node tools/intake/cli.mjs add ./image.png --name "作品名" --character deepseek --description "可选说明"
node tools/intake/cli.mjs pull-issues
node tools/intake/cli.mjs verify
node tools/intake/cli.mjs prune --apply   # 仅在回源 sha256 已确认后执行
```

中转区不进 git，站点不读它，收录脚本也不写 `dist/`。管理 API 只是站长自用的回环接口，不是公开投稿 API。完整约定见 [`tools/intake/README.md`](tools/intake/README.md)。

**分类与正文评价都靠看图定，不能只按作品名猜。** `categoryIds` 要按四类判据（梗图 / 插画 / 设定图 / 漫画，见 `archive/2026-09-24/数据契约.md` §4.1）逐张看图后写进清单；`commentary`（详情页正文，蓝色大肥鱼第一人称评价）同样逐张看图手写。多格分镜只会是 `comic`，而 `tools/` 里的兜底启发式只认前三类，判不出 `comic`，别指望脚本自动分类。

**原图的 Raw 路径发布后不要改名或移动。** 站点、外链和已建好的评论串都按它取图。

## 内容侧脚本

```bash
node tools/prepare_works.mjs                     # 幂等迁移清单、冻结 id 与 slug
python tools/generate_image_derivatives.py       # 生成投稿派生图（幂等可重跑）
node tools/sync_issue_template.mjs --write       # 同步投稿表单的角色下拉
python tools/prepare_favicon.py                  # 从 assets/ 生成站点图标
```

`id` 与 `slug` 一经发布即冻结：`slug` 决定详情页 URL，`id` 决定评论串（`sticker-<id>`），都不能重算。

`dist/data/blue-fish-editorial.json` 是首批记录的分类与评价叠加层，按 `sourcePath` 认图，**不要删**。仓库外导入流程会重新生成上游 raw 清单，把里面写好的编辑结论一起冲掉，所以编辑结论要另存这份文件（理由同 `dist/blue-fish-ids.json` 的冻结映射）。上游 raw 清单里有 59 条既没作品名也没标签，够不上作品门槛；它们靠这份叠加层补上名字与标签才得以上线，作品数从 191 增加到 250。

`blue-fish-originals/` 放自托管的首批原图，照 `owner-picks/` 的先例：仓库根、不进构建产物、线上走 GitHub Raw。**不要挪进 `dist/data/`**：同步脚本会把那个目录拷进站点仓，它还会经 `shared/data` 出现在发布产物里。

## Git 流程

1. 从最新 `main` 开功能分支，用 `feat/`、`fix/`、`docs/`、`chore/` 前缀；
2. **显式列文件名暂存，禁止 `git add -A` 和 `git add .`**；
3. 提交信息用前缀 + 中文简述；
4. 推送功能分支，复核后快进 `main` 再推送。

## 更新与发布

**每次更新都由服务器从 GitHub 拉取，不要本地上传。**

- 图片、清单或脚本改动推到 `origin/main` 后，服务器侧发布脚本用 `git fetch` 加 `reset --hard origin/main` 拉取；
- 发布脚本在 `lmy414/bluedafeiyu` 的 `ops/` 里，负责构建站点并原子切换 `current`。本仓库不负责发布；
- 不要用面板上传整包，也不要直接改服务器上的文件；
- 服务器配置（`DEPLOY_ENV`、`DEPLOY_ROOT`、`CONTENT_DIR` 等）由维护者在服务器侧维护，不写进仓库。
