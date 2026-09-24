# ai-girl-stickers —— 图片与投稿仓库

AI 娘表情包站「蓝色大肥鱼」的**图片 / 内容 / 投稿仓库**。这里只放原图、派生图、清单和投稿表单；**站点源码不在这里**。

站点源码仓库：<https://github.com/lmy414/bluedafeiyu>
线上站点：<https://xn--pssy23gqgbz2d718b.com>

## 投稿

- 投稿表情包：<https://github.com/lmy414/ai-girl-stickers/issues/new?template=sticker-submission.yml>
- 申请署名 / 删除：<https://github.com/lmy414/ai-girl-stickers/issues/new?template=takedown-request.yml>
- 表单本体在 [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/)；角色下拉由 `tools/sync_issue_template.mjs` 与 `dist/characters.json` 保持同步。

投稿流程不涉及 git：走 Issue 表单提交，维护者审核后用下面的脚本处理。

## 目录

| 路径 | 说明 |
| --- | --- |
| `dist/submissions/originals/` | 投稿**原图**（png / jpg / gif），线上不托管，下载走 GitHub Raw |
| `dist/submissions/large/` | 投稿派生图，最长边 ≤ 1280 的 WebP |
| `dist/submissions/previews/` | 投稿缩略图，约 480px 的 WebP |
| `dist/submissions/works.json` | 投稿清单（`id` / `slug` 是主键，**一经发布即冻结**） |
| `owner-picks/` | 站长自用板块的**原图** |
| `dist/owner-picks/works.json`、`dist/owner-picks/previews/` | 该板块的清单与预览 |
| `dist/data/` | 首批「蓝色大肥鱼档案馆」数据：`blue-fish-classification.json` 清单 + `blue-fish/previews/` 预览图 |
| `dist/characters.json`、`dist/categories.json`、`dist/blue-fish-ids.json` | 角色 / 分类 / 首批 ID 冻结映射 |
| `dist/favicon.ico`、`dist/favicon.png`、`dist/avatar.png` | 站点图标与头像（内容侧原件） |
| `assets/` | 站点图标的原始素材 |
| `archive/2026-09-24/` | 仓库拆分前的历史文档副本（仅供追溯，不是当前规范） |

## 原图 Raw URL 稳定性

**图片路径不要改名、不要移动。** 清单里的 `path` 是 GitHub Raw 绝对 URL，站点、外链和已收录的讨论串都按它取原图：

```text
https://raw.githubusercontent.com/lmy414/ai-girl-stickers/main/dist/submissions/originals/<角色>/<文件>
https://raw.githubusercontent.com/lmy414/ai-girl-stickers/main/owner-picks/<文件>
```

首批 146 条的原图在上游仓库 [`EDMOK/blue-fish-archive`](https://github.com/EDMOK/blue-fish-archive)（`media/` 下），本站只托管其预览图与清单。改路径等于同时断掉线上图片和外链。

`dist/submissions/works.json` 的 `id` 与 `slug` 由 `tools/prepare_works.mjs` 生成后冻结；`slug` 决定站点详情页 URL，`id` 决定评论串（Giscus term `sticker-<id>`），二者都不能重算。

## 内容侧脚本

零依赖，只用 Node 内置模块 / Python 标准库与 Pillow：

```bash
node tools/prepare_works.mjs                     # 幂等迁移清单、冻结 id 与 slug
python tools/generate_image_derivatives.py       # 生成投稿派生图（幂等可重跑）
node tools/sync_issue_template.mjs --write       # 同步投稿表单的角色下拉
python tools/prepare_favicon.py                  # 从 assets/ 生成站点图标
```

改完投稿数据要重跑一次 `tools/generate_image_derivatives.py`，否则新记录没有派生图。

## 站点构建

站点代码在 [lmy414/bluedafeiyu](https://github.com/lmy414/bluedafeiyu)。它用 `tools/sync_content.mjs` 把本仓库 `dist/` 下的清单与派生图同步过去，再生成快照、详情页与发布产物：

```bash
# 在代码仓库里执行，指向本仓库的克隆路径
node tools/build_site.mjs --content-dir /path/to/ai-girl-stickers
```

## 授权

首批收录不逐条核实作者与授权，`author` 留空、`license.type` 为 `unknown`，详情页明写「未标注 / 授权状态不明」并挂删除申请入口。权利人可随时通过上面的下架表单申请署名或删除。
