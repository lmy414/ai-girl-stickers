# 蓝色大肥鱼 · 公开图片存档

AI 娘表情包站「蓝色大肥鱼」的公开图片存档仓库，同时作为 **GitHub 投稿入口**。这里只存放投稿原图与派生图；**站点程序与结构化数据不在这里**，在独立仓库 [lmy414/bluedafeiyu](https://github.com/lmy414/bluedafeiyu)。

- 线上站点：<https://xn--pssy23gqgbz2d718b.com>
- 站点程序与结构化数据：<https://github.com/lmy414/bluedafeiyu>

## 投稿入口

投稿和申请署名 / 删除都走 GitHub Issue 表单，不需要 fork，也不需要会 Git：

- 投稿表情包：<https://github.com/lmy414/ai-girl-stickers/issues/new?template=sticker-submission.yml>
- 申请署名 / 删除：<https://github.com/lmy414/ai-girl-stickers/issues/new?template=takedown-request.yml>
- 表单本体在 [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/)。

投稿时只需上传图片、填写图片名称和角色，一句话说明可选。图片请**直接拖进表单的「图片文件」框上传**，贴网盘或图片外链不算投稿。审核与收录由维护者完成，系统性信息（尺寸、体积、哈希等）由维护者从文件本身算出。

图片格式、内容范围与投稿确认要求见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 图片目录

| 路径 | 说明 |
| --- | --- |
| `dist/submissions/originals/` | 投稿原图（png / jpg / gif），线上不托管，下载走 GitHub Raw |
| `dist/submissions/large/` | 投稿派生图，最长边 ≤ 1280 的 WebP |
| `dist/submissions/previews/` | 投稿缩略图，约 480 px 的 WebP |
| `owner-picks/` | 站长自用板块的原图 |
| `dist/owner-picks/previews/` | 该板块的预览图 |
| `dist/data/blue-fish/previews/` | 「蓝色大肥鱼档案馆」首批作品的预览图 |
| `blue-fish-originals/` | 首批已收编的 59 件无名作品原图（自托管，线上走 GitHub Raw，不要挪进 `dist/data/`） |
| `dist/favicon.ico`、`dist/favicon.png`、`dist/avatar.png` | 站点图标与头像（内容侧原件） |
| `dist/qq-group.png` | 关于页「交流群」的 QQ 群二维码（518×518） |
| `assets/` | 站点图标的原始素材 |

## 原图 Raw URL 稳定性

**图片路径不要改名、不要移动。** 站点、外链和已收录的讨论串都按 GitHub Raw 绝对 URL 取原图：

```text
https://raw.githubusercontent.com/lmy414/ai-girl-stickers/main/dist/submissions/originals/<角色>/<文件>
https://raw.githubusercontent.com/lmy414/ai-girl-stickers/main/owner-picks/<文件>
```

首批收录里，已收编的 59 件原图自托管在根目录 [`blue-fish-originals/`](blue-fish-originals/)，其余原图仍在上游仓库 [`EDMOK/blue-fish-archive`](https://github.com/EDMOK/blue-fish-archive)（`media/` 下），本仓库只托管它们的预览图。改路径等于同时断掉线上图片和外链。

## 版权与下架

本项目是非官方同人整理，图片著作权始终归原作者。首批收录不逐条核实作者与授权，详情页会写明「未标注 / 授权状态不明」并挂出删除申请入口。

原作者或受委托人可随时通过[署名与删除表单](https://github.com/lmy414/ai-girl-stickers/issues/new?template=takedown-request.yml)申请补充署名、更正来源或下架作品，维护者通常在一个工作日内响应。详见 [CONTRIBUTING.md](CONTRIBUTING.md)。
