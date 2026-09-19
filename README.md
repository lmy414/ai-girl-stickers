# 蓝色大肥鱼

**一个收集 AI 娘二创表情包的站。** DeepSeek 娘抱着空饭碗说自己是吃白饭的蓝色大肥鱼，豆包娘、Kimi 娘、通义千问娘、Gemini 娘各自被画成了同人表情包——这些散落在社区帖里的图，这里按角色归了档。

线上地址：**[蓝色大肥鱼.com](https://蓝色大肥鱼.com/)**（中文域名，浏览器里会显示成 `xn--pssy23gqgbz2d718b.com`）
源码仓库：[github.com/lmy414/ai-girl-stickers](https://github.com/lmy414/ai-girl-stickers)

你能做的事：按角色翻、按名称 / Tag / 角色别名 / 提交者模糊搜索、给单张图开详情页下载原图或复制链接、在详情页留言、把自己的图投进来。

三句话说清它的技术形态：**纯静态前端**（没有构建、没有依赖、没有后端），**数据是一个 JSON**，**图片是一堆文件**。把 `dist/` 丢到任何静态托管上就能跑。

本站是非官方同人整理项目，跟任何 AI 产品的官方都没关系。图片著作权归原作者，程序代码是 MIT——这两件事分开算。

打算改这个仓库的话，先看 [AGENTS.md](AGENTS.md)（约定和坑都在里面）；**大型更新先在 [CHANGELOG.md](CHANGELOG.md) 补一条，再动代码。**

---

## 跑起来看看

```bash
python -m http.server 5173 -d dist
# 然后打开 http://127.0.0.1:5173
```

得用 `http://` 打开。直接双击 `index.html` 用 `file://` 看也行，但评论区不会出来——Giscus 拿不到合法的 Origin，会拒绝加载，你只能看到版式。

---

## 怎么投稿

**投稿就是提一个 Issue，不用 fork、不用会 git。** 打开 [投稿表单](https://github.com/lmy414/ai-girl-stickers/issues/new?template=sticker-submission.yml)——站里首页右上角的「提交作品」按钮打开的就是它——把图拖进去、几项填完，剩下的交给维护者。

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
| 图片文件 | `path` `thumbnailPath` `format` `width` `height` `fileSize` `sha256` | 由维护者从文件本身算出来，你不用填 |
| 内容来源 | `origin.type` | 五种取值 |
| 来源作者 | `origin.author` | 能填就填；留空的话详情页会显示「未标注」 |
| 来源链接 | `origin.sourceUrl` | 可空，没有公开出处也能投 |
| 授权状态 | `license.type` | 六种取值，会原样显示在详情页 |
| 授权说明 | `license.note` | 一句话，显示在详情页的来源与授权栏 |
| 你的 GitHub 用户名 | `submitter` | 站内不收集邮箱，投稿者就是 Issue 的发起人 |

### 不会被收的情况

真人肖像、未授权的商业素材、跟 AI 角色无关的通用表情包；含违法、仇恨或骚扰内容的图；来源和授权都说不清、又拒绝补充的。

### 提交之后会发生什么

Issue 会带上 `sticker-submission` 标签排队。维护者做四件事：按 `sha256` 查重、把文件放进仓库、生成预览图、补齐上面那些系统字段，再按 `数据契约.md` §10 的校验过一遍。记录先是 `pending`，确认没问题才变 `published`——**只有 `published` 会出现在站上**。被拒会说明原因，补了信息可以再提。

本站没有账号系统，也不统计浏览和下载，所以投稿对外公开的信息只有你的 GitHub 用户名。

### 想改或想撤

原作者要补署名、改来源信息或下架作品，用 [署名与删除申请](https://github.com/lmy414/ai-girl-stickers/issues/new?template=takedown-request.yml)。作品详情页授权栏里的那个链接打开的就是它，而且会把作品名直接带进 Issue 标题，你不用手动复制是哪张图。收到有效的版权投诉，会先下架再核实。

### 模板与标签

两份模板在 `.github/ISSUE_TEMPLATE/` 下：`sticker-submission.yml`（投稿，13 项）和 `takedown-request.yml`（署名与删除）。`config.yml` 里保留了空白 Issue，所以报 bug、提版式建议这类也能提，只是投稿和删除请走模板。

两个标签 `sticker-submission`、`takedown` 必须在仓库里真实存在，否则模板里的 `labels` 会被 GitHub 静默忽略——派生这个仓库时记得补。

站内入口统一由 `app.js` 的 `issueUrl(template, title)` 生成，要改模板文件名时只改这一处。

---

## 数据是怎么来的

站点读两份清单。首批那份连图带清单都在 `dist/data/` 下，而这个目录被 `.gitignore` 排除——**图片不进公开仓库，只存在于维护者本机和服务器的 `releases/` 里**。

- `blue-fish-classification.json`：205 条记录，从上游公开清单 `EDMOK/blue-fish-archive` 导入。`app.js` 的 `loadLocalDataset()` 会在首屏渲染**之前**读它，再用 `mapLocalRecord()` 映射成作品记录。名称、Tag、角色三项都齐的才进展示，现在是 146 条，剩下 59 条留在清单里不显示。
- `blue-fish/previews/`：205 张预览图，约 34 MB，本站自己托管。列表和详情页显示的都是它。

另一份是 **`dist/owner-picks/works.json`（站长自用板块）**：站长自己用 AI 生成的图，不属于任何角色，所以单开一个分类放着。这一份和它的预览图**都进 git**，原图在仓库根的 `owner-picks/` 下——跟首批正好相反，因为首批的原图在上游仓库，而这批本来就是本站自己的东西。分类借的是角色的结构，所以它出现在角色抽屉和 `#/character/owner-picks` 里，但它不是角色，投稿表单的角色下拉里没有这一项。

「下载原图」给的是上游仓库里的原始文件（约 189 MB，本站不存）。所以这是一个外部依赖：上游把仓库转私有或删掉，下载就会失效。仓库参数是按记录传的（`rawGithubPath(repo, path)` + `CONFIG.upstreamRepo`），因为以后投稿的图片进的是本仓库而不是上游——别把它写死成一个仓库名。站长自用那批不依赖上游：清单里直接写着本仓库 `owner-picks/` 的 raw 地址。

**关于授权，这个站选择如实标注而不是替你判断。** 上游清单没有逐条记录作者和授权，所以每条记录的 `origin.author` 是空的、`license.type` 是 `unknown`，详情页就明明白白显示「未标注 / 授权状态不明」，并挂一个[署名与删除申请](#想改或想撤)的入口。新收录的条目如果知道作者，就按 [`数据契约.md`](数据契约.md) 把 `submitter` / `origin` / `license` 填上。

万一 JSON 读不到（比如用 `file://` 打开），页面会退回 `app.js` 里的演示数据：12 条手写作品 + 按索引确定性生成的 168 条占位作品，共 180 条，刷新顺序不变。这些演示作品没有图片文件，所以不会去请求任何图片路径。想彻底去掉演示数据，删掉 `generatePlaceholderWorks()` 和 `PLACEHOLDER_*` 常量即可，其余代码不用动。

---

## 页面结构

| Hash | 内容 |
|---|---|
| `#/` | 作品列表（向下滚动持续加载）|
| `#/character/<角色ID>` | 某个角色的作品，角色 ID 见 `数据契约.md` |
| `#/tag/<标签>` | 带某个标签的作品 |
| `#/work/<作品ID>` | 作品详情页，含评论区 |
| `#/about` | 关于本站（收录范围、来源与授权、版权与删除、常见问题）|
| `#/about/<章节>` | 直达某一节，例如 `#/about/license` |

作品卡片是真实的 `<a>`，所以中键新标签打开、复制链接发给别人、前进后退都是正常的。

文件长这样：

```text
dist/
  index.html    壳层：顶栏、页脚、主题引导脚本、分享用的 og、站点验证标记
  tokens.css    设计 Token（原始值 + 语义层，深浅两套）
  styles.css    组件与页面样式（只用 Token，不写死色值）
  app.js        数据、路由、视图、评论区
  robots.txt    爬虫规则（/data/ 不放行，免得爬虫来吃 34 MB 图片）
  data/         图片与清单（不进仓库）
assets/         favicon 原图与透明底版本
tools/          favicon 处理脚本
数据契约.md      字段定义、投稿校验、来源与授权类型
CHANGELOG.md     更新日志（大型更新先写这里）
AGENTS.md        给代理的约定：改之前先看
.github/         Issue 模板
```

---

## 评论区

用 **Giscus**：评论存在 GitHub Discussions 里，静态站不用自己养服务器和数据库，而且跟投稿用的是同一套 GitHub 账号体系。

本站已经跑通，复用的是博客那个评论区仓库 [`lmy414/lmy414-blog-comments`](https://github.com/lmy414/lmy414-blog-comments) 的 `Announcements` 分类，参数写在 `dist/app.js` 的 `CONFIG.comments.giscus` 里（`repoId=R_kgDOTUvnVw`、`categoryId=DIC_kwDOTUvnV84DF4fs`）。2026-09-18 首发评论验证过，讨论串能正常建在 `Announcements` 下。

派生这个项目时换三步：

1. 仓库设成 public，`Settings → Features` 勾上 **Discussions**。留着默认的 **Announcements** 分类——只有维护者能在里面发起新讨论，正好对应"评论只能挂在作品自己的串下"。
2. 安装并授权 [giscus App](https://github.com/apps/giscus)，去 [giscus.app/zh-CN](https://giscus.app/zh-CN) 填仓库和分类，拿 `repoId` 与 `categoryId`。
3. 四项填进 `CONFIG.comments.giscus`。填全才生效；没填全时详情页显示"评论功能尚未开启"的说明，不会报错。

### 一个必须记住的坑：`mapping=specific`

本站是 hash 路由，**所有作品的 `pathname` 一模一样**。Giscus 默认按 `pathname` 映射讨论串，那样整站作品的评论会全挤进同一个讨论。所以代码里钉死了：

```js
data-mapping = "specific"
data-term    = `sticker-${sticker.id}`
```

一张作品一个串。**改路由方案时一定回来看这条。**

### 其它方案

不想让访客必须登录 GitHub，就换 Waline（可匿名评论、有后台、免费层能跑），代价是多一个要维护的实例。Utterances 只支持一层评论且维护放缓；Twikoo 功能最全但配置最重；Disqus 带广告和追踪脚本，跟这个站"零追踪"的定位冲突。切换时改 `CONFIG.comments.provider`，并在 `mountComments()` 里加一个分支。

---

## 视觉规矩

参照对象是 **pixiv、GitHub 这类内容站**，不是营销落地页：默认亮色，中性灰底配标准蓝，小圆角（2 / 3 / 4 / 6px），正文 14px、页面标题最大 24px，区块之间用 1px 描边分开。不用辉光、渐变背景、玻璃拟态、悬浮位移和大阴影。

1. 颜色、字号、间距、圆角、阴影、动效时长只在 `tokens.css` 定义；
2. `styles.css` 只引用语义变量（`--text-primary`、`--bg-surface`、`--space-4`…），不出现硬编码色值；
3. 小屏差异优先重定义 Token，其次才写断点样式（`tokens.css` 末尾已有 1080 / 760 两档收缩）；
4. 分节标题用 `.section-label`（同字号加粗 + 下划线），不要再用 11px 全大写、拉字距的那种小标签；
5. 图标一律内联 SVG（`app.js` 的 `ICONS`），不用 emoji；
6. 主题靠 `data-theme="light|dark"` 切换，深浅两份语义层都在，组件层不用动。深色是中性灰黑、不带蓝调。偏好存在 `localStorage` 的 `aigirl-theme-2`——想强制所有人回到默认主题，换这个键名就行（`index.html` 的引导脚本和 `CONFIG.theme.storageKey` 要一起改）。

作品图容器的底色（`--art-*`）也在 Token 里，由 `.sticker-art` 的渐变消费；图片加载失败时的回退块沿用同一个容器，JS 里不另存一份色板。

---

## 列表加载与瀑布流

首批渲染 `PAGE_SIZE`（24）张，快滑到底时追加下一批。只往列表后面插节点，不整页重渲染，所以滚动位置不会被重置；到底显示「已经到底了 · 共 N 张」。

触发用了两条路：`IntersectionObserver` 观察底部哨兵，外加一个 `scroll` 兜底检查，两条都指向同一个幂等的 `loadNextPage()`。因为 IO 在部分内嵌 / 后台渲染环境里回调会延迟，只靠它会出现"滑到底不加载"。

**瀑布流故意不用 CSS `multi-column`。** 多列布局在追加内容时会整体重新平衡——实测从 24 张追加到 48 张，有 18 张卡片跳列、最大位移 2369px，滚动时脚下内容是乱的。现在由 `appendToMasonry()` 把每张卡投进「当前最矮的一列」（列数由 `--card-min` 和 `--columns-max` 决定，断点仍只写在样式表里），已有卡片永不移动：同样条件下实测位移 0px，180 张加载完四列高度完全相等。

列高用「缩略图高度（按真实宽高比换算）+ `CARD_BODY_HEIGHT`」估算，它只影响各列是否均衡，不影响正确性；改卡片信息区高度时顺手调一下这个常量。视口宽度变化会防抖重排一次，筛选或排序变化时批次回到第一页。

---

## 发布与回滚

`dist/` 就是站点根目录，GitHub Pages / Cloudflare Pages / Netlify 直接发布这个目录都行。

本站正式跑在阿里云香港的 nginx 上，服务器上是"发布目录 + 软链"：

```text
/srv/www/dafeiyu/
├─ releases/<YYYYmmdd-HHMMSS>/   每次发布一个自包含目录
└─ current -> releases/<版本>     nginx root 指向它，切软链就是切版本
```

旧域名 `dafeiyu.dshregistry.xyz` 整站 301 到中文域名。

发布脚本 `tools/deploy.mjs` 留在维护者本机（里面写着服务器路径，不进公开仓库）。它通过本地 QuickSite Studio 面板的 `qss` CLI 操作服务器，写命令都会在面板任务中心先显示计划、等人工确认，并落审计日志。等价的手工流程就四步：

```bash
tar -czf site.tgz -C dist .                                 # 1. 打包 dist/
qss fs upload site.tgz /srv/www/dafeiyu/<ts>.tgz            # 2. 上传
qss exec "mkdir -p /srv/www/dafeiyu/releases/<ts> \
  && tar -xzf /srv/www/dafeiyu/<ts>.tgz -C /srv/www/dafeiyu/releases/<ts> \
  && ln -sfn /srv/www/dafeiyu/releases/<ts> /srv/www/dafeiyu/current && nginx -t"   # 3. 解包 + 切软链
curl -sI https://xn--pssy23gqgbz2d718b.com/                 # 4. 回读验证
```

新 release 里目录设 755、文件设 644；图片目录用 `cp -al` 从上一版硬链接过来，不用每次重传 34 MB。回滚就是把 `current` 指回上一个 `releases/<ts>`，不删任何文件。

改了 `app.js` 或样式，记得同步 `index.html` 里的 `?v=` 数字，否则访问者拿的还是旧缓存。

---

## 许可与版权边界

程序代码以 [MIT License](LICENSE) 发布。`assets/` 里的站点图标是本项目生成的品牌素材。

投稿或收录进来的表情包**不会因为进了这个仓库就自动获得 MIT 授权**，能不能用、怎么用，以每张作品详情页上的来源与授权为准。标注「原作者明确授权」或 CC 协议的按对应条款走；标注「授权状态不明」的先联系原作者，别直接商用。

发现署名、来源或授权有问题，走 Issue 模板里的「署名与删除申请」。
