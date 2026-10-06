<div align="center">
  <img src="https://raw.githubusercontent.com/lmy414/ai-girl-stickers/main/dist/avatar.png" width="112" alt="蓝色大肥鱼站点图标">
  <h1>蓝色大肥鱼 · 公开图片存档</h1>
  <p><strong>站点图片、投稿与下架入口</strong></p>
  <p>
    <a href="https://xn--pssy23gqgbz2d718b.com/"><img src="https://img.shields.io/website?url=https%3A%2F%2Fxn--pssy23gqgbz2d718b.com%2F&style=for-the-badge&label=site&up_message=online&down_message=offline" alt="站点在线状态"></a>
    <a href=".github/ISSUE_TEMPLATE/sticker-submission.yml"><img src="https://img.shields.io/badge/submissions-GitHub%20Issue%20Forms-2f81f7?style=for-the-badge&logo=github&logoColor=white" alt="通过 GitHub Issue 表单投稿"></a>
    <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/formats-PNG%20%7C%20JPG%20%7C%20GIF%20%7C%20WebP%20%7C%20APNG-6f42c1?style=for-the-badge" alt="支持 PNG、JPG、GIF、WebP 和 APNG"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/docs%20license-MIT-2ea44f?style=for-the-badge" alt="文字材料使用 MIT 许可"></a>
  </p>
  <p>
    <strong>简体中文</strong> ·
    <a href="README.en.md">English</a> ·
    <a href="README.ja.md">日本語</a>
  </p>
</div>

---

本仓库保存“蓝色大肥鱼”站点使用的投稿原图、派生图和站点图片资源。这里也是 GitHub 投稿与下架入口。站点页面、结构化数据和程序在独立仓库 [lmy414/bluedafeiyu](https://github.com/lmy414/bluedafeiyu)。

## 项目概览

| 项目 | 内容 |
| --- | --- |
| 仓库定位 | 公开图片存档与 GitHub 投稿入口 |
| 原图访问 | 详情页下载使用 GitHub Raw |
| 投稿表单 | GitHub Issue Forms |
| 支持格式 | PNG、JPG、GIF、WebP、APNG |
| 图片权利 | 归原作者，以详情页来源与授权为准 |

## 常用入口

| 用途 | 地址 |
| --- | --- |
| 在线浏览 | <https://xn--pssy23gqgbz2d718b.com/> |
| 投稿作品 | <https://github.com/lmy414/ai-girl-stickers/issues/new?template=sticker-submission.yml> |
| 署名或下架申请 | <https://github.com/lmy414/ai-girl-stickers/issues/new?template=takedown-request.yml> |
| 站点源码 | <https://github.com/lmy414/bluedafeiyu> |

## 仓库内容

这里的 `dist/` 是站点约定的内容目录，不是构建产物。构建站点时，程序会从这些固定路径同步图片和模板。

| 路径 | 内容 |
| --- | --- |
| `.github/ISSUE_TEMPLATE/` | 投稿表单和署名、下架申请表单 |
| `dist/submissions/originals/` | 投稿原图，线上下载使用 GitHub Raw 地址 |
| `dist/submissions/large/` | 详情页使用的派生图，最长边不超过 1280 像素的 WebP |
| `dist/submissions/previews/` | 列表和搜索页使用的缩略图，约 480 像素的 WebP |
| `owner-picks/` | “站长自用”板块的原图 |
| `dist/owner-picks/previews/` | “站长自用”板块的预览图 |
| `dist/data/blue-fish/previews/` | “蓝色大肥鱼档案馆”首批作品的预览图 |
| `blue-fish-originals/` | 首批已收编作品的自托管原图。其余首批原图仍在上游仓库 [EDMOK/blue-fish-archive](https://github.com/EDMOK/blue-fish-archive) |
| `assets/` | 站点图标的原始素材 |
| `dist/favicon.ico`、`dist/favicon.png`、`dist/avatar.png`、`dist/qq-group.png` | 站点图标、头像和 QQ 群二维码 |

图片格式、大小和内容范围见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

## 站点图标

仓库保存站点的全部公开图标。README 顶部使用 `dist/avatar.png`。

| 文件 | 尺寸 | 用途 |
| --- | --- | --- |
| [`dist/avatar.png`](https://github.com/lmy414/ai-girl-stickers/blob/main/dist/avatar.png) | 96 × 96 | 站点头像和 README Logo |
| [`dist/favicon.ico`](https://github.com/lmy414/ai-girl-stickers/blob/main/dist/favicon.ico) | 256 × 256 | 浏览器标签页图标 |
| [`dist/favicon.png`](https://github.com/lmy414/ai-girl-stickers/blob/main/dist/favicon.png) | 512 × 512 | 高清站点图标 |
| [`dist/qq-group.png`](https://github.com/lmy414/ai-girl-stickers/blob/main/dist/qq-group.png) | 518 × 518 | QQ 交流群二维码 |

## 图片路径

站点、详情页和外部引用都通过固定 Raw URL 获取原图。图片收录后不要改名或移动。否则线上图片、外链和已有讨论串都可能失效。

```text
https://raw.githubusercontent.com/lmy414/ai-girl-stickers/main/dist/submissions/originals/<角色>/<文件名>
https://raw.githubusercontent.com/lmy414/ai-girl-stickers/main/owner-picks/<文件名>
```

普通浏览和下载请直接使用线上站点。需要引用原图时，优先使用作品详情页给出的链接。

## 投稿与下架

投稿不需要 fork，也不需要会 Git。打开投稿表单，直接上传图片，填写图片名称和角色，并从梗图、插画、漫画、立绘、设定图、其他中选择一个类型。一句话说明可选，Tag、来源和授权由维护者审核时补充，所选类型也会经审核核对。

支持 PNG、JPG、GIF、WebP 和 APNG，单张建议不超过 10 MB。与 AI 角色无关的通用表情包、真人肖像和未授权商业素材不收录。

原作者或受委托人可以通过署名与下架表单申请补充署名、更正来源或删除作品。完整规则见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

## 版权

本项目是非官方同人整理，图片著作权始终归原作者。公开仓库或收录到站点，都不会让图片自动获得 MIT 授权。每张图能否使用、如何使用，以作品详情页标注的来源与授权为准。

仓库中的文字材料按 [`LICENSE`](LICENSE) 发布。这个许可不覆盖图片、角色设计或第三方素材。
