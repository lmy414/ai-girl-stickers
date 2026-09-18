# AGENTS.md

给在这个仓库里干活的代理。README 是给人看的介绍，这里是**改之前必须知道的约定**。

## 先读

1. [`README.md`](README.md) —— 站点形态、投稿流程、评论、视觉规矩、发布方式；
2. [`数据契约.md`](数据契约.md) —— 字段与枚举的唯一来源，改数据前先对它；
3. [`CHANGELOG.md`](CHANGELOG.md) —— 历史，以及那条规则：**大型更新先补一条日志，再动代码**。

## 这个仓库的形状

纯静态前端：**没有构建、没有依赖、没有测试框架、没有后端**。`dist/` 就是站点根目录，`app.js` 一个文件里装着数据、路由和视图。

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
- **`dist/data/`（图片与清单）、`tools/deploy.mjs`、`staging/` 都不进 git**，已经被 `.gitignore` 排除。别用 `git add -A` 把它们扫进来。
- 新增角色要同时改两处：`app.js` 的 `characters` 数组，和投稿模板 `sticker-submission.yml` 里的角色下拉选项。

## 已经定下的方向，不用再问

- **首批 205 条不逐条核实作者与授权。** 风险由站点自己承担：`author` 留空、`license.type` 为 `unknown`，详情页明写「未标注 / 授权状态不明」并挂删除申请入口。不要把"补齐授权字段"再列成待办。
- **图片只放 GitHub 仓库**，不自建对象存储或 CDN。只有等仓库真装不下了，才讨论自托管（首批原图约 189 MB，预览图 34 MB 已在本站）。
- **评论区固定复用** [`lmy414/lmy414-blog-comments`](https://github.com/lmy414/lmy414-blog-comments) 的 Discussions（`Announcements` 分类，`repoId=R_kgDOTUvnVw`、`categoryId=DIC_kwDOTUvnV84DF4fs`），不为表情包站另开评论仓库。
- 中文域名在脚本、日志和 `og:url` 里一律用 punycode `xn--pssy23gqgbz2d718b.com`。

## 线上与发布

站点跑在阿里云香港的 nginx 上（QuickSite Studio 面板里的 `aliyun-hk`），根目录 `/srv/www/dafeiyu/current` → `releases/<时间戳>`。

- 服务器操作走本地面板的 `qss` CLI。**写命令会在面板任务中心显示计划、等用户确认**，没确认前不许声称"已完成"。
- **`qss fs upload` 是直连 SFTP 写入，不经确认门**——上传任何东西到服务器之前，先跟用户要授权。
- 发布 = 新建一个 `releases/<ts>` 再切 `current`；图片目录用 `cp -al` 从上一版硬链接过来。**回滚只改软链，不删任何 release。**
- 新 release 目录设 755、文件设 644。

## 本机环境坑（Windows + Git Bash）

- 传给 node 的远端绝对路径会被 MSYS 改写（`/srv/...` → `C:/Program Files/Git/srv/...`）：先 `export MSYS_NO_PATHCONV=1`。
- 这里的 `tar` 是 GNU tar：带盘符的 `C:\...` 会被当成「主机:路径」去连机。归档名用相对名 + `cwd` 定位。
- 管道会吞真实退出码：判成败用 `cmd > log 2>&1; echo EXIT=$?`，再另读日志。
- `qss` 的只读白名单里没有 `sha256sum` / `readlink` / `getent`，用它们会平白多弹一次确认；能用 `stat` / `ls` / `curl` 就别用。
- 提交时 git 会提示 LF→CRLF，无害。
