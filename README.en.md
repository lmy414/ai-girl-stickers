<div align="center">
  <img src="https://raw.githubusercontent.com/lmy414/ai-girl-stickers/main/dist/avatar.png" width="112" alt="Blue Big Fish site icon">
  <h1>Blue Big Fish · Public Image Archive</h1>
  <p><strong>Images, submissions and takedown requests for the Blue Big Fish archive</strong></p>
  <p>
    <a href="https://xn--pssy23gqgbz2d718b.com/"><img src="https://img.shields.io/website?url=https%3A%2F%2Fxn--pssy23gqgbz2d718b.com%2F&style=for-the-badge&label=site&up_message=online&down_message=offline" alt="Website status"></a>
    <a href=".github/ISSUE_TEMPLATE/sticker-submission.yml"><img src="https://img.shields.io/badge/submissions-GitHub%20Issue%20Forms-2f81f7?style=for-the-badge&logo=github&logoColor=white" alt="Submit through GitHub Issue Forms"></a>
    <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/formats-PNG%20%7C%20JPG%20%7C%20GIF%20%7C%20WebP%20%7C%20APNG-6f42c1?style=for-the-badge" alt="Supports PNG, JPG, GIF, WebP and APNG"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/docs%20license-MIT-2ea44f?style=for-the-badge" alt="Documentation licensed under MIT"></a>
  </p>
  <p>
    <a href="README.md">简体中文</a> ·
    <strong>English</strong> ·
    <a href="README.ja.md">日本語</a>
  </p>
</div>

---

This repository stores the submitted originals, derivatives and public image assets used by Blue Big Fish. It is also the GitHub entry point for submissions and takedown requests. The website, structured data and application code live in [lmy414/bluedafeiyu](https://github.com/lmy414/bluedafeiyu).

## Project Snapshot

| Item | Details |
| --- | --- |
| Purpose | Public image archive and GitHub submission entry point |
| Original files | Downloaded from GitHub Raw on work detail pages |
| Submission form | GitHub Issue Forms |
| Supported formats | PNG, JPG, GIF, WebP, APNG |
| Image rights | Owned by the original author; check each work's source and license |

## Quick Links

| Purpose | Link |
| --- | --- |
| Browse online | <https://xn--pssy23gqgbz2d718b.com/> |
| Submit a work | <https://github.com/lmy414/ai-girl-stickers/issues/new?template=sticker-submission.yml> |
| Request attribution or takedown | <https://github.com/lmy414/ai-girl-stickers/issues/new?template=takedown-request.yml> |
| Website source | <https://github.com/lmy414/bluedafeiyu> |

## Repository Contents

`dist/` is the content directory expected by the website. It is not build output. During a site build, the application syncs images and templates from these fixed paths.

| Path | Contents |
| --- | --- |
| `.github/ISSUE_TEMPLATE/` | Submission, attribution and takedown forms |
| `dist/submissions/originals/` | Submitted originals; online downloads use GitHub Raw |
| `dist/submissions/large/` | Detail-page derivatives, WebP with a maximum long edge of 1280 pixels |
| `dist/submissions/previews/` | List and search thumbnails, roughly 480-pixel WebP images |
| `owner-picks/` | Originals for the Owner Picks section |
| `dist/owner-picks/previews/` | Previews for the Owner Picks section |
| `dist/data/blue-fish/previews/` | Previews for the first Blue Big Fish archive collection |
| `blue-fish-originals/` | Self-hosted originals for the first collected set; other originals remain in [EDMOK/blue-fish-archive](https://github.com/EDMOK/blue-fish-archive) |
| `assets/` | Original source files for the site icon |
| `dist/favicon.ico`, `dist/favicon.png`, `dist/avatar.png`, `dist/qq-group.png` | Site icons, avatar and QQ group QR code |

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for formats, size limits and content rules.

## Brand Assets

This repository stores all public site icons. The README header uses `dist/avatar.png`.

| File | Size | Purpose |
| --- | --- | --- |
| [`dist/avatar.png`](https://github.com/lmy414/ai-girl-stickers/blob/main/dist/avatar.png) | 96 × 96 | Site avatar and README logo |
| [`dist/favicon.ico`](https://github.com/lmy414/ai-girl-stickers/blob/main/dist/favicon.ico) | 256 × 256 | Browser tab icon |
| [`dist/favicon.png`](https://github.com/lmy414/ai-girl-stickers/blob/main/dist/favicon.png) | 512 × 512 | High-resolution site icon |
| [`dist/qq-group.png`](https://github.com/lmy414/ai-girl-stickers/blob/main/dist/qq-group.png) | 518 × 518 | QQ group QR code |

## Image Paths

The website, detail pages and external references use fixed Raw URLs for original files. Do not rename or move an image after it has been included. Otherwise the live image, external links and existing discussion threads may all break.

```text
https://raw.githubusercontent.com/lmy414/ai-girl-stickers/main/dist/submissions/originals/<character>/<filename>
https://raw.githubusercontent.com/lmy414/ai-girl-stickers/main/owner-picks/<filename>
```

Browse and download through the website when possible. When citing an original, prefer the link shown on its work detail page.

## Submissions and Takedown

You do not need to fork the repository or know Git. Open the submission form, upload the image directly, and enter its name and character. A one-line note is optional. Maintainers add tags, categories, source and license information during review.

PNG, JPG, GIF, WebP and APNG are supported. A single image should be no larger than 10 MB. Generic stickers unrelated to AI characters, real-person portraits and unauthorized commercial assets are not accepted.

Original authors or authorized representatives can use the attribution and takedown form to request credit changes, source corrections or removal. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full process.

## Copyright

This is an unofficial fan archive. Image copyright always belongs to the original author. Publishing an image in this repository or including it on the website does not automatically grant an MIT license. Check the source and license shown on each work's detail page before reuse.

Text materials in this repository are released under [`LICENSE`](LICENSE). That license does not cover images, character designs or third-party assets.
