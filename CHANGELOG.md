# 更新日志

规则只有一条：**大型更新先在这里补一条，再动代码。** 改错字、调一个间距不用；只要碰到数据结构、路由、投稿或评论流程、发布方式、视觉体系，就先写——这条记录既是给用户看的变更说明，也是动手前的一次自检：写不出"为什么改"，通常说明还没想清楚。

版本号按发布走：服务器上 `releases/<YYYYmmdd-HHMMSS>` 的目录名就是这一版的身份证，回滚是把 `current` 软链指回上一个目录。

---

## 2026-09-22 · git 更新规范入册；服务器压缩、HTTP/2 与缓存分层收尾

发布：随 GitHub 驱动流程上线（release 目录名与提交 SHA 见文末补记）。文档不进站点产物，站点内容与上一版一致；nginx 配置改动也不走发布脚本——经 `qss fs write` 改 `sites-available`（自动留 `.bak`）→ `nginx -t` → reload 即生效。线上回读补记在文末。

- **`AGENTS.md` 新增「git 更新规范」**（本次主要更新内容）：功能分支（`chore/` / `feat/` 前缀）→ 大更新先补本日志 → 显式列文件名暂存（禁 `git add -A`）→ 提交前本地起服务浏览器验收、涉及投稿图片跑派生图脚本、涉及产物跑 `node tools/build.mjs`、改前端三件套 bump `?v=` → 提交信息用 `feat:` / `fix:` / `docs:` / `chore:` 前缀加中文简述，一次提交只做一件事 → 推功能分支，维护者复核后 fast-forward `main` 再推 `origin/main` → **推送不等于发布**，发布仍是维护者在服务器跑 `ops/deploy-server.sh` 副本。细则见 `CONTRIBUTING.md` §四。
- **服务器压缩收尾**：nginx 的 `gzip on` 一直开着（`nginx.conf` 是发行版默认文件，mtime 2023-12），但 `gzip_types` 没配，只有 HTML 在压缩——`styles.css`(38 KB)、`app.js`(74 KB)、三份清单(187 KB) 全部裸传。本次在站点 vhost 内补 `gzip_types`（css / js / json / xml / svg / plain）、`gzip_vary on`、`gzip_comp_level 5`、`gzip_min_length 1024`。**Brotli 不启用**：服务器 `modules-enabled` 为空、没有 ngx_brotli，按路线图「以线上环境实际支持为准」用 gzip。
- **HTTP/2**：vhost 里两个 `listen 443 ssl` 都补 `http2`（nginx 1.24 语法）。
- **缓存分层补齐**：此前只有三档——图片 7 天、`/data/` 与 HTML `no-cache`、其余（js / css / json）落到 `location /` 的 `no-cache`，`?v=` 因此一直拿不到长缓存。现在加 `map $arg_v`：**带 `?v=` 的 js / css 为 `public, max-age=31536000, immutable`，不带的仍 `no-cache`**；清单（含 `submissions/works.json`）与 HTML 保持回源校验，图片维持 7 天。代价是 **bump `?v=` 升级为硬性前提**——改了 `app.js` / `styles.css` / `tokens.css` 不 bump，访问者最长一年拿旧缓存。
- 回滚方式：`fs write` 自动留了 `.bak` 与面板本地历史快照，写回旧内容再 reload 即回滚；不涉及 release 与发布脚本。

线上回读（2026-09-22 16:36 reload 后实测）：HTTP/2 掌声成功（Node `http2` 模块 ALPN，首页 200）；`app.js?v=19`、`styles.css?v=17`、`tokens.css?v=13` 均 `Content-Encoding: gzip` + `Cache-Control: public, max-age=31536000, immutable`；不带 `?v=` 的 `app.js` 仍 `no-cache`；`submissions/works.json` 与 `data/blue-fish-classification.json` 为 gzip + `no-cache`；`avatar.png` 为 `public, max-age=604800`；HTML 为 gzip + `no-cache`。`nginx -t` 通过。另需说明两点：其一，`nginx -t` 有 4 条 warn（3 条 `protocol options redefined`、1 条 `duplicate MIME type "text/html"`），都在别的租户 vhost（`mirrorpin` / `wasteland-ring`）上、解析顺序在本站文件之前，不是本次引入，本次未动它们；其二，443 端口的 `listen` 选项是 socket 级的，隔壁 `wasteland-ring` 早就在自己 vhost 里声明过 `http2`，所以 HTTP/2 在本次改动之前可能已对全端口生效——本站现在显式声明，不再依赖别人的配置。

发布落地（2026-09-22 17:01）：已上线 `releases/20260922-170101`（上一版 `releases/20260922-145230`），即提交 `a214d82`（`a214d82773e59caf78761a213d8a27221072233b`）。构建 85 个文件（35 条 `published` 投稿、4 条 owner-picks），`data/` 仍由 `shared/data` 硬链接复用；健康检查全部通过（首页 / `robots.txt` / `submissions/works.json` / 抽样 `previews/*.webp` 均 200），`logs/deploy.log` 已追加记录，旧 release 全部保留（当前共 7 个）。站点内容与上一版一致——本轮只改文档，文档不进产物。

## 2026-09-22 · 发布流程改为 GitHub 驱动

发布：已上线 `releases/20260922-145230`（上一版 `releases/20260922-023440`），即提交 `a684d56`。新链路首次发布于 2026-09-22 14:52（+08:00），健康检查全部通过；旧的上传发布方式自本版起停用。

发布这条链路整个换掉了。以前是「维护者本机打包 `dist/` 成 tgz → 用面板的 `qss` CLI SFTP 上传 → 服务器解包成新 release → 切软链」；现在是「本地改仓库并提交推送 GitHub → 服务器上的 Git 工作树拉取 `origin/main` → 服务器构建一份干净 release → 原子切 `current`」。服务器不再接收任何手工上传的整包，构建过程可复现、可审计。

- 新增零依赖构建 `tools/build.mjs`。只用 Node 内置模块，把 `dist/` 递归复制成一份发布产物到指定目录；跳过 `dist/data/` 与 `dist/submissions/originals/`，产物里不出现这两个目录。复制是纯字节拷贝，不写时间戳、不改 JSON、不跑压缩，同一输入两次构建的文件集合与每个文件的 SHA-256 完全一致（确定性）。复制后做断言：必需文件存在且非空、两个被排除目录确实不存在、两份 `works.json` 可解析为数组、`published` 记录引用的缩略图与详情图真实存在——任一条不过就删掉产物并非零退出。
- 新增 `package.json`（最小、零依赖、`"type": "module"`），`npm run build` 即 `node tools/build.mjs`。
- 新增服务器侧脚本 `ops/deploy-server.sh` 与 `ops/rollback-server.sh`。发布脚本按固定顺序执行：校验配置 → `flock` 防并发 → 拉取 `origin/main` → 临时目录里构建 → **先 `chmod` 再 `cp -al` 硬链接数据** → 校验产物 → `nginx -t` → `mv` 进 `releases/<YYYYmmdd-HHMMSS>` → 原子切 `current` → 健康检查（首页、`robots.txt`、`submissions/works.json` 与一张 `submissions/previews/*.webp` 必须 200，且图有内容长度）→ 失败即把 `current` 指回旧目标并非零退出。回滚脚本只切软链、重新健康检查，不重新构建、不删任何文件。两个脚本都从环境变量读配置（可选由 `DEPLOY_ENV` 指定一个配置文件），不内置域名与凭据。
- **首批 `data/` 迁到服务器持久目录 `shared/data`。** 这 34 MB 清单加预览图以前在每个 release 里各存一份，现在只在 `shared/data` 存在一份，发布时用 `cp -al` 硬链接进新 release。硬链接共享 inode 与权限，所以发布脚本里 `chmod` 必须发生在 `cp -al` **之前**——顺序反了会把共享数据和所有旧 release 里同一 inode 的权限一起改掉。
- **投稿原图 `dist/submissions/originals/` 继续不进发布产物。** 原件留在 GitHub 仓库供 Raw 下载，本站既不打包也不在线托管。
- **所有旧 release 保留用于回滚，回滚只切软链，不删除任何文件。** `acme/`、`shared/data` 同样绝不删。
- 服务器根目录那两枚历史上传残留包 `20260920-204141.tgz`(5.3MB) 与 `20260920-205024.tgz`(10.1MB) 不是 release。**已在新 release 健康检查通过、并核实没有 nginx / cron / systemd / current 引用之后精确删除**，共回收约 15.4 MB；`releases/` 目录一个都没动。
- 本轮不引入前端框架、不引入后端、不改 nginx 配置；前端源码仍在 `dist/`。
- 本条之前已落地但尚未入库的 1A 加载优化内容（`dist/app.js` 的 `fetchJson` 改 `no-cache` 与图片属性、`dist/avatar.png`、投稿派生图 `previews/` + `large/`、`tools/generate_image_derivatives.py`、`dist/submissions/works.json` 的路径改写）随本条一起提交；它们的详细口径见下方 2026-09-21 的两条记录。

线上回读（2026-09-22）：首次发布生成 `releases/20260922-145230`，`current` 已切过去，旧的 5 个 release 全部保留、可随时切回。产物里没有 `submissions/originals/`、也没有构建内部标记 `.build-output`；投稿派生图 `previews` 35 个 / `large` 35 个、`owner-picks` 预览 4 个；目录 755、文件 644。`shared/data` 与新旧 release 的 `data/` 是同一 inode（硬链接复用，206 个文件）。公网回读首页、`robots.txt`、`submissions/works.json`（35 条 `published`）、抽样预览图与 `data/blue-fish-classification.json` 全部 200；`/submissions/originals/**` 为 404（原图走 GitHub Raw，实测 200 且字节数与清单 `fileSize` 一致）。发布脚本的失败回滚语义、回滚脚本 `ops/rollback-server.sh` 均已就绪（`bash -n` 通过，旧 release 可切回）；只改文档不需要发布——文档不在站点产物里。

## 2026-09-21 · 平台化升级立项与路线规划

发布：尚未上线——本条记录评估结论和阶段路线，当前站点功能、数据与部署方式均未改变。

这次评估确认，站点后续可以从「无构建的纯静态前端」逐步升级为「可构建的静态前端 + 索引 API + 数据库」，但不把图片字节交给后端中转：GitHub 继续保存原图，浏览器直接加载缩略图 / 详情图和 GitHub 原图，后端只负责作品元数据、搜索、筛选、投稿审核和未来明确批准的服务能力。

当前第一期按四个可独立回滚的子阶段推进：

1. **1A 资产与传输提速**：先补齐投稿缩略图和详情图，处理超大 GIF，启用压缩与合理缓存；这是解决首屏几十 MB 图片请求的直接措施。
2. **1B 前端构建化**：在不强制改用 React/Vue 的前提下拆分现有单文件前端，引入可复现构建、内容指纹和长期缓存。
3. **1C 后端索引 API**：以稳定 ID 为前提迁移数据到 SQLite 等轻量数据库，实现游标分页、搜索、筛选和详情接口，不再让前端正常路径全量下载 JSON。
4. **1D 双轨切换**：新旧数据源并行核对，保留静态快照兜底，再逐步切换 API；后端发布必须增加迁移、健康检查、备份和回滚步骤。

在开始数据库迁移前，必须冻结首批作品 ID 与 Giscus 的 `sticker-<id>` 对应关系，规范三套现有清单的字段差异，并确定公开 DTO 与脱敏边界。统计代码、匿名访问统计和热度字段不随本期默认启用；它们会先经过数据契约、隐私说明和公开文案的单独变更评估。

详细进度表、目标架构、验收指标和风险清单见 [`站点升级路线图.md`](站点升级路线图.md)。本条之后的加载优化记录仍保留，作为第一期 1A 的性能基线。

## 2026-09-21 · 第一期加载优化落地

发布：已上线 `releases/20260922-023440`（上一版 `20260921-165620`）。服务器 nginx 的 gzip / Brotli、HTTP/2 和缓存头仍未调整，不属本次范围。

- 新增 `tools/generate_image_derivatives.py`，用 Pillow 幂等生成投稿的 480px 列表缩略图和 1280px 详情图；静态图输出 WebP，动图输出受尺寸与帧数约束的动画 WebP。
- `dist/submissions/works.json` 的 `thumbnailPath` / `fullPath` 不再指向投稿原图，首页卡片和详情页先加载派生图，下载按钮仍直接指向 GitHub Raw 原图。
- `dist/app.js` 的图片标签补充异步解码、列表低优先级和详情高优先级提示；清单请求从 `no-store` 改为 `no-cache`，允许浏览器使用协商缓存。
- 新增轻量 `dist/avatar.png`（15 KB），卡片、作者栏、角色列表和站点可见品牌标记不再重复依赖 262 KB 的 `favicon.png`；`favicon.png` 继续保留为 favicon 与 `og:image`。
- **发布方式随之调整**：投稿原图 `dist/submissions/originals/` 不再进发布包。它们此前是被整包传上服务器的（63.7 MB），而站点并不需要托管原件——下载走 GitHub Raw，列表与详情走本站派生图。`tools/deploy.mjs` 现在跳过该目录，发布包从 73.7 MB 降到 8.3 MB。线上旧的 `originals/` 路径随本版一起变成 404；回滚到旧 release 仍能恢复（旧目录各自完整）。
- 详细口径：投稿 35 条原图合计 63.7 MB，派生缩略图 2.1 MB、详情图 5.4 MB；默认首页前 24 张全部是投稿，按原图算 46.5 MB，改后按缩略图算 0.55 MB。

线上回读（2026-09-22）：`app.js?v=19` 返回 `cache: "no-cache"`；`submissions/previews/*.webp`、`submissions/large/*.webp`、`avatar.png` 均 200；浏览器实测默认首页 24 张卡片全部走缩略图、`/submissions/originals/` 请求数为 0，首屏投稿缩略图合计约 0.42 MB。

关于首批那 4 张超大 GIF：脚本在本地把它们转成了动画 WebP（25.4 MB → 3.5 MB）并同步了清单，但 `dist/data/` 不进发布包、发布时用上一版硬链接，所以**这一步没有上线**，线上仍是原来的 GIF 与旧清单，行为与发布前一致（那 4 条本来就被收录门槛挡住、不展示）。下次真的重新导入或整包部署 `dist/data/` 时才会体现。

## 2026-09-21 · 加载优化立项

发布：尚未上线——**本条只记录诊断与方向，代码一行未动**。按本日志开头的规矩，先补记录再动手。

逐一查了一遍站点的加载路径，慢的不是代码，是图片：列表默认按「最新收录」排序，而投稿恰好是最新的，于是首页前 24 张卡片全部落在投稿原图上。以下数字为 2026-09-21 在本机 `dist/` 与线上实测：

- **投稿没有缩略图。** `dist/submissions/works.json` 里 `thumbnailPath` 直接等于原图路径，35 个 PNG/JPG/GIF 共 63.7 MB，单张 0.7–3.85 MB。首屏这 24 张合计约 46.5 MB；全部 185 张里，投稿这 35 张一家就占去 63.7 MB。这同时背离了 `数据契约.md` §3 对 `thumbnailPath` 的定义（「瀑布流使用的缩略图路径」）。对照之下，`data/blue-fish/previews/` 那 201 张 480px webp 一共才 7 MB、中位数 34 KB——预览机制本身是好的，只有投稿这条路没接上。
- **`data/blue-fish/previews/` 里混着 4 张超大 GIF**：10.35 / 10.20 / 4.84 / 1.25 MB，合计 26.6 MB，占该目录 33 MB 里的绝大部分。它们顶着 `previews/` 的名字，实际是原始动图；滚到就全额下载，这一点在落地阶段核对后**不成立**，见下面的更正。
- **（2026-09-21 落地阶段核对更正上一条）** 这 4 条记录在上游清单里 `name` 与 `tags` 都是空的，会被 `mapLocalRecord()` 的收录门槛挡掉，前端从来没有请求过它们；真正被请求的是另外 201 张 webp。它们占的是部署体积与「清单字段为空、只能靠 `sourcePath` 回退」这种不一致，不是首屏字节。更正后的处置见「第一期加载优化落地」。
- **线上文本资源零压缩，也没有 HTTP/2。** 带 `Accept-Encoding: gzip, br` 请求 `styles.css`、`app.js`，响应没有 `Content-Encoding`，`Content-Length` 就是未压缩体积（38 KB / 72.8 KB）；nginx 的 `listen 443 ssl` 上没有 `http2`。
- **清单每次进站重下。** `app.js` 的 `fetchJson()` 用了 `cache: "no-store"`，三份清单共 187 KB 每次重新下载；而 `app.js` 是 body 末尾的同步 `<script>`，清单请求只能等它下载并执行完才发出，`#app` 在那之前一直是空白。
- **`favicon.png`（262 KB）被当头图用**：站标、每张卡片的头像、页脚都指向它，其中站标就在首屏关键路径上。

已定的方向，分三层：

1. **资产**——给投稿生成 480px webp 缩略图与 1280px 详情图（详情页要保持今天的画质：投稿原图是 1024×1024 / 1086×1448，压到 480px 是肉眼可见的退步）；4 张超大 GIF 与投稿动图转动画 WebP，列表页保留动态效果。
2. **前端**——清单改 `no-cache` 走 ETag 校验、head 内联预取、`app.js` 加 `defer`、图片补 `decoding` / `fetchpriority`。
3. **服务端**——开 gzip 与 HTTP/2，缓存分层（指纹化资源与图片长缓存、清单与 HTML 回源校验）；静态资源改内容指纹，构建产物另出目录。

顺带记两条**考虑过但不做**的：不引入 JS 压缩（本机没有可信的压缩器，而 gzip 已能把 72.8 KB 压到约 18 KB，为 2 KB 去冒手写压缩器出错的风险不值得）；不修剪蓝色大肥鱼清单里被收录门槛挡掉的 59 条（门槛逻辑若与前端出现分歧就是 bug，而 gzip 后省下的只有约 10 KB）。

## 2026-09-21 · 第二批 GitHub Issue 投稿收录

发布：已上线。本条初记「尚未上线，等待香港节点恢复后发布」（当时香港节点 SSH 握手在上一轮大文件上传失败后未恢复，发布被暂缓），与后来的实际状态不符，已更正。

- 收录开放投稿 Issue #12–#17，共 6 张图片：DeepSeek 娘 4 张、通义千问娘 1 张、Grok 娘 1 张。
- 所有记录已补齐角色、Tag、提交者、来源、授权、尺寸、文件大小和 SHA-256，并设为 `published`。
- 2026-09-21 用 HTTPS 核对线上：`submissions/works.json` 已是 35 条，首尾记录与本地仓库逐字一致（`sticker_issue_01_001` … `sticker_issue_16_001`、`sticker_issue_17_001`），本批 6 条全部在列，站点实际已在服务这一版。服务器侧状态（SSH 是否恢复、release 时间戳）未核实，故不在此记录。

## 2026-09-20 · 首批 GitHub Issue 投稿收录

发布：已上线（随第二批投稿一起上线；2026-09-21 核对线上清单已含这批记录）。

- 收录开放投稿 Issue #1–#11，共 29 张图片；其中 #7 为 13 张 DeepSeek 娘多图投稿，#8 为 7 张 Claude 娘多图投稿。
- 新增 `dist/submissions/works.json` 与 `dist/submissions/originals/`，记录按数据契约保存名称、Tag、角色、提交者、来源、授权、图片格式、尺寸、文件大小和 SHA-256。
- 前端新增 Issue 收录清单加载；只展示 `published` 记录，原图下载指向本仓库的 Raw 地址。
- #1 未使用投稿表单，来源与授权字段如实保留为 `unknown`；#7、#8 按投稿者填写的 CC0 记录。

## 2026-09-19 · 新增「站长自用」板块

发布：已上线。本条初记「尚未上线，等下次发布一起走」（`owner-picks` 清单与预览最迟随 `releases/20260919-192940` 上线；2026-09-22 核对线上角色抽屉已含「站长自用 4」），与后来的实际状态不符，已更正。

站长自己用 AI 生成了几张图，想放到站上，但它们不属于任何一个 AI 角色，按角色归档会别扭。所以单开一个分类叫「站长自用」，先把这 4 张收进去。

- 4 张原图（1254×1254 PNG，共 5.3 MB）原样进本仓库的 `owner-picks/`，详情页的「下载原图」指向这些文件的 raw 地址；预览图（720px webp，共 204 KB）和清单 `dist/owner-picks/works.json` 一起进 git。这批和首批 205 条不一样：首批的预览只存在于本机与服务器，站长自用这一批全部在仓库里。
- 分类是借 `characters` 的结构实现的，所以 `#/character/owner-picks` 路由、角色抽屉、作品计数、别名搜索都直接可用；但它不是角色，没有进投稿模板的角色下拉。配色用一组中性石板蓝 Token（`--art-owner-picks-*`），不占品牌色。
- 顺手修掉一个会咬人的老问题：`loadLocalDataset()` 以前把清单**整盘替换**进 `stickers`，所以第二份清单一定会被冲掉。现在两份清单并行加载后合并，任一份取不到都不影响另一份；首页那句「另有 N 条待确认」也改成只在 N > 0 时才出现。
- 缓存版本号：`app.js?v=17`、`styles.css?v=17`、`tokens.css?v=13`。

## 2026-09-18 · 修缺陷，投稿与评论打通

发布：`releases/20260918-222343`

- **主域名换成国际化域名 蓝色大肥鱼.com**（punycode `xn--pssy23gqgbz2d718b.com`），旧域名 `dafeiyu.dshregistry.xyz` 整站 301 过来。证书 Let's Encrypt，到期 2026-12-17，续期 dry-run 已跑通。
- **列表不再打 404。** 演示数据以前无条件写 `thumbnailPath`，180 张卡每张都会去请求一个生产机上不存在的 `/previews/*`，靠 `onerror` 把破图藏起来——日志里因此堆了 1735 条 404。现在演示作品不带图片路径，首屏也改成等本地清单读完再渲染，不再闪一次假数据。
- **详情页去掉了一整块空白。** 右侧栏比图片舞台高两百多像素，而「相关作品」排在整行之后，左列下面就是空的。现在相关作品并入左列、侧栏跨两行贴右，实测空隙 267px → 0。
- **投稿与下架改成 GitHub Issue Forms。** 角色、内容来源、授权状态都变成下拉单选，取值就是 `数据契约.md` 里的枚举；另加「署名与删除申请」模板。模板引用的两个标签之前在仓库里不存在，GitHub 会静默忽略，已补建。
- **评论区上线。** Giscus 指向博客那个评论区仓库的 `Announcements` 分类，已实测：首次发言能建串、能留言。
- **生产权限收紧**：站点目录 777、文件 666 → 755 / 644，硬链接过来的图片一并修好。
- 新增 `robots.txt`（`/data/` 不放行，免得爬虫来吃 34 MB 图片）、站点级 og 与 canonical、Google 搜索验证标记。
- **发布方式换成 `releases/` + `current` 软链**，可回滚；发布脚本留在维护者本机，不进公开仓库。
- 清掉死代码：没人调用的 `placeholderSvg()` 与 `toneColors()`、只写不读的 `localImportTotal`，以及详情页上"待主任务审核后再进入公开主干"这类给维护者看却露给访客的措辞。
- 文档：README 重写成介绍而不是规格说明、把投稿写成主线；新增本日志与 `AGENTS.md`（约定与本机环境的坑）。

## 2026-09-15 · 首批真实图片接入并上线

发布：`releases/20260915-151704`（当天 nginx 站点配置同日创建）

- 从上游公开清单 `EDMOK/blue-fish-archive` 导入 205 条记录，名称 / Tag / 角色三项齐全的 146 条进展示，其余 59 条留在清单里不显示。
- 205 张预览图（约 34 MB）由本站托管；清单与图片都不进公开仓库，只存在于本机与服务器。
- 授权按原样标注：`origin.author` 留空、`license.type` 为 `unknown`，详情页如实显示「未标注 / 授权状态不明」。
- 站点改名「蓝色大肥鱼」，换掉品牌图标；以静态站部署到阿里云香港 nginx。

## 2026-09-15 之前 · 首版

- 纯静态前端：hash 路由、按角色与 Tag 浏览、模糊搜索、独立详情页、瀑布流无限加载、深浅两套主题、Design Token 体系。
- 数据是 `app.js` 里的 12 条手写作品 + 168 条按索引确定性生成的占位作品。
- 程序代码以 MIT 开源，投稿走 GitHub Issue。
