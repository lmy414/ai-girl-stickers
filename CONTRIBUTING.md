# 投稿与贡献指南

这份文档写给两类人：想投表情包的**投稿者**，和想改这个仓库的**代码贡献者**。README 是给访客看的总览，这里是具体流程和约定。动手改代码之前，请先读 [AGENTS.md](AGENTS.md)（约定和本机环境的坑都在里面）和 [数据契约.md](数据契约.md)（字段与枚举的唯一来源）。

---

## 一、投稿

**投稿就是提一个 Issue，不用 fork、不用会 git。** 打开[投稿表单](https://github.com/lmy414/ai-girl-stickers/issues/new?template=sticker-submission.yml)——站里首页右上角的「提交作品」按钮打开的就是它。

### 五步

1. **先搜有没有重复。** 同一张图被投过就不必再投；站内搜索能按名称、Tag、角色别名和提交者找。
2. **备好图。** 支持 PNG、JPG、GIF、WebP、APNG，单张建议不超过 10 MB。尽量传原图，别传套了一层压缩的截图。
3. **填表。** 角色、内容来源、授权状态都是下拉单选，选项文字里直接带着 [`数据契约.md`](数据契约.md) 的字段原值（比如 `deepseek`、`internet-found`），照选就行。**Tag 至少写 1 个**——没有 Tag 的条目不会进展示。
4. **把图片拖进「图片文件」那个框。** 这才是上传。贴网盘或图片外链不算投稿。
5. **勾确认再提交。** 三条确认分别是：你有权提交这张图；同意维护者核实后收录、并在收到版权要求时配合修改或删除；知道本站是非官方同人整理、著作权归原作者。

### 表单里每一项最后去哪

| 表单问的 | 存进记录的字段 | 说明 |
|---|---|---|
| 图片名称 | `name` | 卡片与详情页标题，进搜索 |
| 一句话说明 | `description` | 可空，进搜索 |
| 角色 | `characterId` | 只存 ID，所以角色改名不影响已有图片 |
| 角色补充 | — | 选了「其他角色」时用来判断要不要新增角色 |
| Tag | `tags` | 至少 1 个 |
| 图片文件 | `path` `thumbnailPath` `fullPath` `format` `width` `height` `fileSize` `sha256` | 由维护者从文件本身算出来，你不用填 |
| 内容来源 | `origin.type` | 五种取值 |
| 来源作者 | `origin.author` | 能填就填；留空的话详情页会显示「未标注」 |
| 来源链接 | `origin.sourceUrl` | 可空，没有公开出处也能投 |
| 授权状态 | `license.type` | 六种取值，会原样显示在详情页 |
| 授权说明 | `license.note` | 一句话，显示在详情页的来源与授权栏 |
| 你的 GitHub 用户名 | `submitter` | 站内不收集邮箱，投稿者就是 Issue 的发起人 |

本站没有账号系统，也不统计浏览和下载，所以投稿对外公开的信息只有你的 GitHub 用户名。

### 提交之后会发生什么（维护者处理流程）

Issue 会带上 `sticker-submission` 标签排队。维护者做四件事：

1. 按 `sha256` 查重；
2. 把图片文件放进仓库；
3. 跑派生图脚本生成预览图；
4. 补齐上面那些系统字段（尺寸、体积、哈希、`path` / `thumbnailPath` / `fullPath` 等），再按 [`数据契约.md`](数据契约.md) §10 的校验过一遍。

记录先是 `pending`，确认没问题才变 `published`——**只有 `published` 会出现在站上**。被拒会说明原因，补了信息可以再提。

### 模板与标签维护须知

两份模板在 `.github/ISSUE_TEMPLATE/` 下：`sticker-submission.yml`（投稿，13 项）和 `takedown-request.yml`（署名与删除）。`config.yml` 里保留了空白 Issue，所以报 bug、提版式建议这类也能提，只是投稿和删除请走模板。

角色下拉由 `node tools/sync_issue_template.mjs --write` 从 `dist/characters.json` 生成并校验，改角色清单后必须跑一次，否则 `tools/build.mjs` 断言会失败。

两个标签 `sticker-submission`、`takedown` 必须在仓库里**真实存在**，否则模板里的 `labels` 会被 GitHub 静默忽略——派生这个仓库时记得补建。

站内入口统一由 `app.js` 的 `issueUrl(template, title)` 生成，要改模板文件名时只改这一处。

---

## 二、本地开发

### 起服务

```bash
python -m http.server 5173 -d dist   # 打开 http://127.0.0.1:5173
```

改完必须自己起服务在浏览器里看过，不要只靠读代码判断。用 `file://` 直接打开看不到评论区（评论服务拿不到合法 Origin），别据此判断「评论坏了」。

### 改代码前先读

- [AGENTS.md](AGENTS.md) —— 硬性约定与已知问题；
- [数据契约.md](数据契约.md) —— 字段与枚举的唯一来源；
- **大型更新先在 [CHANGELOG.md](CHANGELOG.md) 补一条，再动代码。**

### 改了前端三件套要 bump 缓存版本号

改了 `dist/app.js` / `dist/styles.css` / `dist/tokens.css`，**必须同步 `dist/index.html` 里的 `?v=` 数字**，否则访问者拿的还是旧缓存，你会以为修复没生效。

当前值：`tokens.css?v=13`、`styles.css?v=17`、`app.js?v=21`。

### 新增投稿图片后要生成派生图

```bash
python tools/generate_image_derivatives.py
```

这个脚本为投稿生成 480px 左右的列表缩略图和最长边不超过 1280px 的详情图，**幂等、可重跑**；只有加 `--force` 才会重新编码已存在的派生图。改了投稿数据后要跑一次，否则新记录没有派生图，构建校验会失败。

### 本地构建检查

```bash
node tools/build.mjs              # 默认输出 .build/site
node tools/build.mjs --out .build/check
```

构建会复制 `dist/` 成一份干净产物，并断言必需文件齐全、清单引用的派生图真实存在。**`--out` 指向一个已存在的非空目录时，只有该目录带有构建标记 `.build-output` 才会被直接清空；否则构建会拒绝，需显式加 `--force-clean`。**（危险路径如系统目录、用户主目录永远拒绝。）

想确认构建是确定性的（同一输入两次产物逐字节一致），比对两次产物的文件集合与每个文件的 SHA-256：

```bash
node tools/build.mjs --out .build/a && node tools/build.mjs --out .build/b
(cd .build/a && find . -type f | sort | xargs sha256sum) > /tmp/a.txt
(cd .build/b && find . -type f | sort | xargs sha256sum) > /tmp/b.txt
diff /tmp/a.txt /tmp/b.txt        # 必须为空
```

### 浏览器验收清单

起本地服务实际打开过一遍：

- [ ] 首页列表能滚动加载到底；
- [ ] 搜索（名称 / Tag / 角色别名 / 提交者）能命中；
- [ ] 角色抽屉能筛出对应角色的作品；
- [ ] 作品详情页能打开、能下载原图；
- [ ] 评论区能加载（**要 `http://`，不要 `file://`**）；
- [ ] 深浅两套主题切换正常。

### 视觉规矩六条

参照对象是 **pixiv、GitHub 这类内容站**，不是营销落地页：默认亮色，中性灰底配标准蓝，小圆角（2 / 3 / 4 / 6px），正文 14px、页面标题最大 24px，区块之间用 1px 描边分开。不用辉光、渐变背景、玻璃拟态、悬浮位移和大阴影。

1. 颜色、字号、间距、圆角、阴影、动效时长只在 `tokens.css` 定义；
2. `styles.css` 只引用语义变量（`--text-primary`、`--bg-surface`、`--space-4`…），不出现硬编码色值；
3. 小屏差异优先重定义 Token，其次才写断点样式（`tokens.css` 末尾已有 1080 / 760 两档收缩）；
4. 分节标题用 `.section-label`（同字号加粗 + 下划线），不要再用 11px 全大写、拉字距的那种小标签；
5. 图标一律内联 SVG（`app.js` 的 `ICONS`），不用 emoji；
6. 主题靠 `data-theme="light|dark"` 切换，深浅两份语义层都在，组件层不用动。深色是中性灰黑、不带蓝调。偏好存在 `localStorage` 的 `aigirl-theme-2`——想强制所有人回到默认主题，换这个键名就行（`index.html` 的引导脚本和 `CONFIG.theme.storageKey` 要一起改）。

作品图容器的底色（`--art-*`）也在 Token 里，由 `.sticker-art` 的渐变消费；图片加载失败时的回退块沿用同一个容器，JS 里不另存一份色板。

---

## 三、评论区实现须知

评论区用 **Giscus**：评论存在 GitHub Discussions 里，静态站不用自己养服务器和数据库，而且跟投稿用的是同一套 GitHub 账号体系。

本站复用的是博客那个评论区仓库 [`lmy414/lmy414-blog-comments`](https://github.com/lmy414/lmy414-blog-comments) 的 `Announcements` 分类，参数写在 `dist/app.js` 的 `CONFIG.comments.giscus` 里。

派生这个项目时换三步：

1. 仓库设成 public，`Settings → Features` 勾上 **Discussions**。留着默认的 **Announcements** 分类——只有维护者能在里面发起新讨论，正好对应「评论只能挂在作品自己的串下」。
2. 安装并授权 [giscus App](https://github.com/apps/giscus)，去 [giscus.app/zh-CN](https://giscus.app/zh-CN) 填仓库和分类，拿到仓库与分类 ID。
3. 四项填进 `CONFIG.comments.giscus`。填全才生效；没填全时详情页显示「评论功能尚未开启」的说明，不会报错。

### 一个必须记住的坑：`mapping=specific`

本站是 hash 路由，**所有作品的 `pathname` 一模一样**。Giscus 默认按 `pathname` 映射讨论串，那样整站作品的评论会全挤进同一个讨论。所以代码里钉死了：

```js
data-mapping = "specific"
data-term    = `sticker-${sticker.id}`
```

一张作品一个串。**改路由方案时一定回来看这条。**

### 其它方案

不想让访客必须登录 GitHub，就换 Waline（可匿名评论、有后台、免费层能跑），代价是多一个要维护的实例。Utterances 只支持一层评论且维护放缓；Twikoo 功能最全但配置最重；Disqus 带广告和追踪脚本，跟这个站「零追踪」的定位冲突。切换时改 `CONFIG.comments.provider`，并在 `mountComments()` 里加一个分支。

---

## 四、分支、提交与发布

### 分支与提交约定

从本轮开始生效，向前看：

1. 开一个功能分支，命名用 `chore/` 或 `feat/` 前缀（例如 `chore/github-driven-deploy`）；
2. **显式列文件名暂存，禁止 `git add -A` / `git add .`**——工作区里可能躺着 `.zcode/`、`小红书素材/` 这类不入库内容，一把梭会把它们扫进来；
3. 本地跑派生图脚本（如涉及投稿图片）、跑构建检查、起服务做上面的浏览器验收；
4. 推功能分支；
5. 维护者复核后 fast-forward 到 `main` 并推送；
6. 发布由维护者在服务器上触发 `ops/deploy-server.sh`，**不走 GitHub Actions**。发布细节见 [`docs/维护与发布.md`](docs/维护与发布.md)。

### 提交信息

建议用 `feat:` / `fix:` / `docs:` / `chore:` 前缀加中文简述，跟最近两条历史保持一致。
