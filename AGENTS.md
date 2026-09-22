# AGENTS.md

给在这个仓库里干活的代理。README 是给人看的介绍，这里是**改之前必须知道的约定**。

## 先读

1. [`README.md`](README.md) —— 站点定位、功能概览、投稿与版权入口；
2. [`数据契约.md`](数据契约.md) —— 字段与枚举的唯一来源，改数据前先对它；
3. [`CHANGELOG.md`](CHANGELOG.md) —— 历史，以及那条规则：**大型更新先补一条日志，再动代码**；
4. [`CONTRIBUTING.md`](CONTRIBUTING.md) —— 投稿与开发流程、视觉规矩细则、评论区实现须知；
5. [`docs/维护与发布.md`](docs/维护与发布.md) —— 发布拓扑、`ops/` 脚本用法与数据边界。

## 这个仓库的形状

纯静态前端：**没有前端框架、没有后端、没有测试框架**。`dist/` 仍是站点根目录，也是前端权威源码，`app.js` 一个文件里装着数据、路由和视图（**本轮没做 `src/` 迁移**）。

现在**有了零依赖构建** [`tools/build.mjs`](tools/build.mjs)（Node 内置模块 only，把 `dist/` 复制成一份干净发布产物，跳过 `dist/data/` 与 `dist/submissions/originals/`），以及**服务器侧发布 / 回滚脚本** `ops/deploy-server.sh` / `ops/rollback-server.sh`。`package.json` 只提供 `npm run build`。

改完必须自己起服务在浏览器里看过，不要只靠读代码判断：

```bash
python -m http.server 5173 -d dist   # 打开 http://127.0.0.1:5173
```

用 `file://` 直接打开看不到评论区（Giscus 拿不到合法 Origin），别据此判断"评论坏了"。

## 硬性约定

- **改了 `app.js` / `styles.css` / `tokens.css`，同步 `index.html` 里的 `?v=` 数字。** 不改版本号，访问者拿的还是旧缓存，你会以为修复没生效。
- **样式只消费 Token。** 颜色、字号、间距、圆角、阴影、动效时长一律去 `tokens.css` 定义；`styles.css` 里不出现硬编码色值。小屏差异优先重定义 Token，其次才写断点。图标用 `app.js` 的 `ICONS` 内联 SVG，不用 emoji。
- **Giscus 的 `data-mapping` 必须是 `specific`、`data-term` 必须是 `sticker-<id>`。** 本站是 hash 路由，所有作品的 `pathname` 一模一样，按默认映射会把全部评论塞进同一个讨论串。改路由方案时回看这条。
- **`rawGithubPath(repo, path)` 的仓库参数按记录传。** 首批原图在上游 `EDMOK/blue-fish-archive`（`CONFIG.upstreamRepo`），以后投稿的图片进本仓库——写死一个仓库名会让投稿作品的原图指向错的地方。
- **`dist/data/`（图片与清单）、`staging/`、`.zcode/`、`小红书素材/` 都不进 git**，已被 `.gitignore` 排除。**`tools/deploy.mjs`（已废弃的本机发布脚本）也仍然被排除**，不再进公开仓库。别用 `git add -A` 把它们扫进来，暂存时逐个列文件名。例外是 **`dist/owner-picks/`**（站长自用板块的清单与预览）——它不在 `data/` 下，是进 git 的，因为那批图的原图本来就在同一个仓库里。
- 新增角色要同时改两处：`app.js` 的 `characters` 数组，和投稿模板 `sticker-submission.yml` 里的角色下拉选项。**`owner-picks`（站长自用）是这条的例外**：它借 `characters` 结构做分类，但不是角色，不要加进投稿下拉，也别给它配品牌色 Token（用的是 `--art-owner-picks-*` 那组中性石板蓝）。

## git 更新规范

2026-09-22 起生效，改这个仓库一律走这条链路；投稿流程不涉及 git（见 `CONTRIBUTING.md` §一），细则与体例见 [`CONTRIBUTING.md`](CONTRIBUTING.md) §四。

1. **开功能分支**，命名用 `chore/` 或 `feat/` 前缀（如 `chore/cache-headers`）。
2. **大型更新先在 `CHANGELOG.md` 补一条，再动代码或服务器配置。** 数据结构、路由、投稿/评论流程、发布方式、视觉体系都算大型；改错字、调间距不用。
3. **显式列文件名暂存，禁止 `git add -A` / `git add .`**——不入库清单见「硬性约定」那条。
4. **提交前自检**：本地起服务在浏览器验收（上面那条命令）；涉及投稿图片先跑 `tools/generate_image_derivatives.py`；涉及发布产物跑 `node tools/build.mjs`；改了前端三件套同步 bump `?v=`。
5. **提交信息用 `feat:` / `fix:` / `docs:` / `chore:` 前缀加中文简述**，一次提交只做一件事。
6. **推功能分支，维护者复核后 fast-forward 到 `main`**，再推送 `origin/main`。
7. **推送不等于发布**：发布是维护者在服务器上按「跑副本执行」跑 `ops/deploy-server.sh`；**只改文档不需要发布**。服务器侧的 nginx / 配置改动同样不经发布脚本，走 `qss` 的写命令 + 确认门。

## 加载现状与已知问题

2026-09-22 实测的现状。这些都是**当前事实**，不是待办承诺；动到相关代码前先知道它们存在。

- **投稿缩略图已补齐（2026-09-22 起）。** `dist/submissions/works.json` 的 `thumbnailPath` 指向 `submissions/previews/<角色>/<文件名>.webp`（约 480px），`fullPath` 指向 `submissions/large/...webp`（最长边 ≤1280），`path` 仍是 GitHub Raw 原图。派生图由 `tools/generate_image_derivatives.py` 生成，**幂等可重跑**；改投稿数据后要重跑一次，否则新记录没有派生图。
- **投稿原图不进发布产物，线上也不托管原图。** 原件在 GitHub 仓库（下载走 Raw）。`tools/build.mjs`（以及已废弃的 `tools/deploy.mjs`）都会跳过 `dist/submissions/originals/`；这一条 2026-09-22 之前不成立——那时每次发布都把 63.7 MB 原图整个传上去，包因此有 73.7 MB。
- **`dist/data/blue-fish/previews/` 里仍有 4 张 1.25–10.35 MB 的 GIF**（合计 26.6 MB），顶着 `previews/` 的名字却是原始动图。本机已用脚本把它们转成动画 WebP 并同步了本地清单，但 `dist/data/` 不进发布包，**线上仍是原来的 GIF**（那 4 条被收录门槛挡着、不展示）。
- **`dist/data/blue-fish-classification.json` 由仓库外的导入流程生成、会被重新生成。** 任何对它的加工都必须做成幂等、可重跑的脚本，否则下次导入就被覆盖。另外 `localPreviewPath()` 是**从清单的 `previewPath` 取文件名**去拼本地路径的，换预览图的扩展名时必须同步改清单，不然前端会去找不存在的文件。
- **服务器压缩、HTTP/2 与缓存分层已收尾（2026-09-22，改 nginx vhost，不产生新 release）。** gzip 覆盖 css / js / json / xml / svg / plain（带 `Vary: Accept-Encoding`），实测 `app.js`、`styles.css`、三份清单全部 `Content-Encoding: gzip`；HTTP/2 实测可用（ALPN 掌声 200）。**Brotli 不启用**——服务器没有 ngx_brotli 模块。注意 443 端口的 `listen` 选项是 socket 级的，同机别的 vhost（`wasteland-ring` 等）也声明过 `http2`，`nginx -t` 会有 `protocol options redefined` warn（不是本站引入的，别去动别人的 vhost）。
- **`?v=` 现在真的提供长缓存。** 带 `?v=` 的 js / css 响应是 `public, max-age=31536000, immutable`，不带的仍 `no-cache`；清单（含 `submissions/works.json`）与 HTML 永远回源校验，图片 7 天（`max-age=604800`）。**这把 bump `?v=` 升级成硬前提**：改了三件套不 bump，访问者最长一年拿旧缓存，不再是"多一次回源"的小事。分层实现在站点 vhost 的 `map $arg_v`，口径见 `docs/维护与发布.md` §6。
- **`fetchJson()` 用的是 `cache: "no-cache"`**（`app.js`，2026-09-22 从 `no-store` 改过来），三份清单走协商缓存，不再每次重下。
- **头像与站标已拆开。** 卡片/作者栏/角色列表/页眉页脚用 15 KB 的 `dist/avatar.png`；`favicon.png`（262 KB）只留给 favicon 与 `og:image`，不能删。加新的可见头像位时用 `avatar.png`。

## 已经定下的方向，不用再问

- **首批 205 条不逐条核实作者与授权。** 风险由站点自己承担：`author` 留空、`license.type` 为 `unknown`，详情页明写「未标注 / 授权状态不明」并挂删除申请入口。不要把"补齐授权字段"再列成待办。
- **图片只放 GitHub 仓库**，不自建对象存储或 CDN。只有等仓库真装不下了，才讨论自托管（首批原图约 189 MB，预览图 34 MB 已在本站）。
- **评论区固定复用** [`lmy414/lmy414-blog-comments`](https://github.com/lmy414/lmy414-blog-comments) 的 Discussions（`Announcements` 分类，`repoId=R_kgDOTUvnVw`、`categoryId=DIC_kwDOTUvnV84DF4fs`），不为表情包站另开评论仓库。
- 中文域名在脚本、日志和 `og:url` 里一律用 punycode `xn--pssy23gqgbz2d718b.com`。

## 线上与发布

站点跑在阿里云香港的 nginx 上（QuickSite Studio 面板里的 `aliyun-hk`），根目录 `/srv/www/dafeiyu/current` → `releases/<时间戳>`。**发布已改为 GitHub 驱动**（2026-09-22）：本地改仓库 → 提交推送 GitHub → 服务器 `source/` 工作树拉 `origin/main` → `ops/deploy-server.sh` 构建干净产物并原子切 `current`。细节见 [`docs/维护与发布.md`](docs/维护与发布.md)。

- 服务器操作仍走本地面板的 `qss` CLI。**写命令会在面板任务中心显示计划、等用户确认**，没确认前不许声称"已完成"。
- **`qss fs upload` 在本项目流程里已经完全用不到。** 本轮 `shared/data` 的迁移是在服务器侧用 `cp -al` 从当前 release 的 `data/` 硬链接出来的，**没有任何文件上传**。它是直连 SFTP 写入、不经确认门；真要用之前，先跟用户要授权。
- 发布 = `ops/deploy-server.sh`：拉取 → 构建 → **先 chmod 再 `cp -al` 数据** → `nginx -t` → `mv` 进 `releases/<ts>` → 原子切链 → 健康检查；失败自动把 `current` 指回旧目标。回滚用 `ops/rollback-server.sh <release目录名>`，只切软链、不重新构建。
- **发布根 `/srv/www/dafeiyu/`（文档里的 `$DEPLOY_ROOT`）下现有**：`source/`（Git 工作树，HEAD = `a684d56`）、`shared/data`（首批数据的唯一持久副本，与各 release 的 `data/` 是同一 inode，**不要删**）、`logs/deploy.log`（发布摘要）、`.deploy.lock`、`.staging/`（发布临时目录，`trap` 清理后为空）。
- **服务器私有配置在 `/etc/dafeiyu/deploy.env`**（5 行公开信息：`DEPLOY_ROOT` / `SOURCE_DIR` / `REPO_URL` / `BRANCH=main` / `HEALTH_URL`，**没有任何凭据**）。**脚本默认不再内置这个路径**，要靠 `DEPLOY_ENV` 指定。
- **实际执行发布时先 `cp` 成副本再跑**：`cp "$SOURCE_DIR/ops/deploy-server.sh" "$DEPLOY_ROOT/.deploy-runner.sh" && DEPLOY_ENV=/etc/dafeiyu/deploy.env bash "$DEPLOY_ROOT/.deploy-runner.sh"`。原因是脚本自己会 `git fetch` + `git reset --hard`，可能在运行中把**正在执行的脚本文件本身**替换掉（bash 按字节偏移续读，行为不可预期）。
- 首次发布已是 `releases/20260922-145230`（commit `a684d56`），当前共 6 个 release，旧版全部保留可回滚。**只改文档不需要发布**——文档不在站点产物里（产物 = `dist/` 的构建输出）。
- **`shared/data` 是首批数据的持久副本**，硬链接进每个 release，**不要删**；`acme/`（证书验证目录）同样绝对不能动。**`cp -al` 之后不要再 chmod 任何产物**——硬链接共享 inode 与权限，会把 shared 数据和所有旧 release 里同一 inode 的权限一起改坏。
- 旧的本机发布脚本 `tools/deploy.mjs` **已废弃**，仍留在维护者本机、继续被 `.gitignore` 排除，不再进公开仓库、也不再用于发布。
- 站点根目录 `/srv/www/dafeiyu/` 顶层的历史 `*.tgz`（旧上传方式的残留）已于 2026-09-22 清掉两枚（`20260920-204141.tgz`、`20260920-205024.tgz`，约 15.4 MB），现在顶层没有归档残留。它们不是 release；以后再出现，按同一原则处理：新 release 健康检查通过 + 核实无 nginx / cron / systemd / current 引用 + 精确删除，删之前先跟用户确认。**release、`shared/data`、`acme` 一律不删。**
- **上传大包会卡死（旧发布方式的实测）。** 若还要用 `qss fs upload` 传大目录：74 MB 的包传到约 14 MB 就没进展（120s 超时、0 字节响应），缩到 8 MB 后正常，宁可拆成多次小上传。

## 本机环境坑（Windows + Git Bash）

- 传给 node 的远端绝对路径会被 MSYS 改写（`/srv/...` → `C:/Program Files/Git/srv/...`）：先 `export MSYS_NO_PATHCONV=1`。
- 这里的 `tar` 是 GNU tar：带盘符的 `C:\...` 会被当成「主机:路径」去连机。归档名用相对名 + `cwd` 定位。
- 管道会吞真实退出码：判成败用 `cmd > log 2>&1; echo EXIT=$?`，再另读日志。
- `qss` 的只读白名单里没有 `sha256sum` / `readlink` / `getent` / `nginx -V`，用它们会平白多弹一次确认；能用 `stat` / `ls` / `curl` 就别用。查 nginx 模块用 `ls /usr/lib/nginx/modules` / `ls /etc/nginx/modules-enabled`。
- **`qss fs` 的绝对路径参数会命中上面那条 MSYS 改写坑**（2026-09-22 实测定位）：`fs read /etc/nginx/nginx.conf` 报 `No such file`，真因是开头的 `/` 被 MSYS 改写后才传给 node——`export MSYS_NO_PATHCONV=1` 之后绝对路径正常。来不及设的话，去掉开头斜杠用相对路径也行（相对 `context.path`，空时就是根）。`exec "cat /abs/path"` 不受影响，因为整条命令参数不以 `/` 开头。
- 提交时 git 会提示 LF→CRLF，无害。
- **`qss` 找不到面板时看端口，别怀疑网络。** 面板把实际端口写在 `../server-panel/data/runtime.json`，但那份记录会过期（遇到过写 `42000`、实际监听 `47300`）。用 `QSS_PANEL_URL=http://127.0.0.1:<实际端口>` 覆盖，或加 `--panel`。报错是 `fetch failed` 时先查这个，再查服务器。
- 面板/CLI 走 HTTP 时才受本机代理影响；**面板到服务器的 SSH 不受 `NO_PROXY` 管**，那是系统路由层的事。发布前先 `qss server stats aliyun-hk` 确认在线。
- **本机 Clash / Mihomo 的 TUN 会抢走 SSH 的默认路由**，表现为面板报 `Connection lost before handshake`。已在 `~/.ssh/config` 的 `aliyun-hk` 条目里加 `BindAddress <本机物理网卡地址>` 绕过。**遇到同样报错先查这条路由，不要怀疑服务器。**
