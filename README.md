# 蓝色大肥鱼 · AI 娘二创表情包开放档案

蓝色大肥鱼（蓝色大肥鱼.com）是收集不同 AI 角色拟人化二创表情包的开放档案。按角色浏览，按名称、描述、Tag、角色别名和提交者进行模糊搜索；每张作品有独立详情页，支持原图下载、复制链接和 GitHub Issue 投稿。

本站是非官方同人整理项目，与任何 AI 产品官方无关。图片版权归原作者所有；仓库中的程序代码与投稿图片的授权状态分开处理。

公开仓库：[github.com/lmy414/ai-girl-stickers](https://github.com/lmy414/ai-girl-stickers)

纯静态前端：无构建、无依赖、无后端。直接托管 `dist/` 目录即可。

```
dist/
  index.html    壳层：顶栏、页脚、主题引导脚本、分享用 og
  tokens.css    设计 Token（原始值 + 语义层，深浅两套主题）
  styles.css    组件与页面样式（只消费 Token，不写死色值）
  app.js        数据、路由、视图、评论区适配
  robots.txt    爬虫规则（/data/ 不放行，避免爬虫吃走图片）
  data/         首批图片与清单（.gitignore 排除，只在本地和服务器上）
数据契约.md      字段定义、投稿校验、授权类型
tools/           favicon 处理脚本（发布脚本按本机运维处理，不进仓库）
```

## 本地预览

```bash
python -m http.server 5173 -d dist
# 打开 http://127.0.0.1:5173
```

必须用 http 打开才能看到评论区：Giscus 在 `file://` 下没有合法 Origin，加载会被拒绝。用 `file://` 直接打开 `index.html` 只能看版式。

## 投稿

投稿和版权请求都走 GitHub Issue，用 **Issue Forms（YAML 模板）**收集，字段与 `数据契约.md` 一一对应：角色、内容来源、授权状态都是下拉单选，取值就是契约里的 `characterId` / `origin.type` / `license.type`，审核时不需要再猜。

模板在 `.github/ISSUE_TEMPLATE/` 下，共两份，`config.yml` 里关掉了空白 Issue：

| 模板 | 用途 | 打的标签 |
|---|---|---|
| `sticker-submission.yml` | 表情包投稿（13 项，图片直接拖进「图片文件」框） | `sticker-submission` |
| `takedown-request.yml` | 原作者申请署名、更正来源或下架 | `takedown` |

两个标签需要在仓库里存在，否则模板里的 `labels` 会被 GitHub 静默忽略（已建好）。

站内入口：首页与页脚的「提交作品」按钮直接打开投稿表单（`app.js` 的 `goSubmit()` → `issueUrl("sticker-submission.yml", "[投稿] ")`）；作品详情页的授权栏和「关于本站 → 版权与删除」链到删除申请模板，并把作品名带进标题。

来源链接不是必填项，自己生成或没有公开出处的作品也可以投稿，但仍需要如实填写来源和授权状态。维护者审核后才会进入公开数据。

图片一律放 GitHub 仓库，不自建对象存储：首批原图仍指向上游 `EDMOK/blue-fish-archive`（`CONFIG.upstreamRepo`），后续投稿的图片进本仓库，所以 `rawGithubPath(repo, path)` 的仓库参数是按记录传的，不要写死。等仓库大到装不下再考虑自托管。

## 路由

| Hash | 内容 |
|---|---|
| `#/` | 作品列表（无限向下加载）|
| `#/character/<角色ID>` | 某角色的作品（角色 ID 见 `数据契约.md`）|
| `#/tag/<标签>` | 带该标签的作品 |
| `#/work/<作品ID>` | 作品详情页（含评论区）|
| `#/about` | 关于本站（文档页）|
| `#/about/<章节>` | 直接跳到文档页某一节，如 `#/about/license` |

作品卡片是真实 `<a>` 链接，中键新标签打开、复制链接分享、前进后退都能用。

## 列表的无限向下加载

- 首批渲染 `PAGE_SIZE`（24）张，滑到接近底部时追加下一批，全程只往列表后面插节点，
  不整页重渲染，滚动位置不会被重置；到底后显示「已经到底了 · 共 N 张」。
- 触发方式用了两条：`IntersectionObserver` 观察底部哨兵，外加 `scroll` 兜底检查。
  两条都指向同一个幂等的 `loadNextPage()`——IO 在部分内嵌 / 后台渲染环境里回调会延迟，
  只靠它会出现「滑到底不加载」。
- **瀑布流不用 CSS `multi-column`**：多列布局在追加内容时会整体重新平衡，实测追加一批
  （24→48 张）就有 18 张卡片跳列、位移最多 2369px，滚动时脚下内容会乱。现在由
  `appendToMasonry()` 把卡片投放到「当前最矮的一列」（`--card-min` / `--columns-max`
  两个变量决定列数，断点仍只写在样式表里），已有卡片永不移动——同样条件下实测位移 0px，
  180 张加载完四列高度完全相等。
- 列高用「缩略图高度（按真实宽高比换算）+ `CARD_BODY_HEIGHT`」估算，只影响各列均衡，
  不影响正确性。改卡片信息区高度时顺手调一下这个常量。
- 视口宽度变化会防抖重排一次（列数变了）。筛选条件或排序变化时批次数回到第一页。

## 演示数据说明

为了让「一直往下滑」能真的滑起来，`app.js` 里除了 12 条手写作品，还会按索引确定性地生成
168 条占位作品（名称、Tag、尺寸、格式全部由索引推导，刷新不变），合计 180 条。

接入真实投稿数据时，删掉 `generatePlaceholderWorks()` 与 `PLACEHOLDER_*` 常量即可，
其余代码不用动。

## 设计 Token 约定

视觉基准是 **pixiv / GitHub 这类成熟内容站**，不是落地页：亮色为默认，中性灰底 + 标准蓝，
小圆角（2/3/4/6px），正文 14px、页面标题 24px 封顶，区块之间靠 1px 描边划分，
不用辉光、渐变背景、玻璃拟态、悬浮位移和大阴影。

1. 颜色、字号、间距、圆角、阴影、动效时长只在 `tokens.css` 里定义；
2. `styles.css` 只使用语义变量（`--text-primary`、`--bg-surface`、`--space-4` …），不出现硬编码色值；
3. 小屏差异优先"重定义 Token"，其次才加断点样式（`tokens.css` 末尾已有 1080 / 760 两档收缩）；
4. 分节标题用 `.section-label`（同字号加粗 + 下划线），**不要再用 11px 全大写字母间距的小标签**；
5. 图标一律内联 SVG（`app.js` 的 `ICONS`），不使用 emoji；
6. 换主题靠 `data-theme="light|dark"`，两份语义层已就位，组件层不用改。
   深色是中性灰黑（不带蓝调），默认亮色；主题偏好存在 `localStorage` 的 `aigirl-theme-2`，
   想强制所有人回到默认主题时换这个键名即可（`index.html` 的引导脚本与 `CONFIG.theme.storageKey` 要同步改）。

作品图容器的底色（`--art-*`）也定义在 Token 里，由 `.sticker-art` 的渐变消费；图片加载失败时的回退块沿用同一容器，JS 里不重复色板。

## 评论接入

**结论：用 Giscus。** 它把评论存在 GitHub Discussions 里，静态站点无需任何服务器、数据库或运维，与本站已有的 GitHub 投稿流程同源。

**当前状态：已开启**，复用博客评论区仓库 [`lmy414/lmy414-blog-comments`](https://github.com/lmy414/lmy414-blog-comments) 的 `Announcements` 分类（`repoId=R_kgDOTUvnVw`、`categoryId=DIC_kwDOTUvnV84DF4fs`，已写进 `dist/app.js`）。派生此项目时按下面三步换成你自己的仓库。

### 三步开启

1. 准备仓库：把站点仓库设为 public，`Settings → Features` 勾选 **Discussions**；在 Discussions 里保留默认的 **Announcements** 分类（该分类只有维护者能发起新讨论，正好对应"评论只能挂在作品讨论串下"）。
2. 安装并授权 [giscus App](https://github.com/apps/giscus)；打开 [giscus.app/zh-CN](https://giscus.app/zh-CN)，填入仓库与分类，拿到 `repoId` 与 `categoryId`。
3. 填进 `dist/app.js`：

```js
comments: {
  provider: "giscus",
  giscus: {
    repo: "你的用户名/仓库名",
    repoId: "R_kgDO…",
    category: "Announcements",
    categoryId: "DIC_kwDO…"
  }
}
```

四项填全即生效；未填全时详情页会显示"评论尚未开启"的占位说明，不会报错。

### 为什么是 `mapping=specific`

本站是 hash 路由，所有作品的 `pathname` 完全一样。Giscus 默认按 `pathname` 映射讨论串，会把 12 张作品的评论全部塞进同一个讨论。因此代码里固定使用：

```js
data-mapping = "specific"
data-term    = `sticker-${sticker.id}`
```

保证一张作品一个独立讨论串。**改路由方案时务必回看这一条。**

### 备选方案对比

| 方案 | 需要服务器吗 | 登录方式 | 深浅色 | 取舍 |
|---|---|---|---|---|
| **Giscus**（当前） | 不需要，评论存在 GitHub Discussions | GitHub 账号 | 支持，可跟随本站主题 | 零运维；国内访问 GitHub 不稳定时评论区加载慢 |
| Utterances | 不需要，存在 GitHub Issues | GitHub 账号 | 支持 | 只支持一层评论，项目维护已放缓 |
| Waline | 需要部署（Vercel/Netlify 免费层可跑，自带数据库） | 可匿名 | 支持 | 有后台、支持表情与邮件通知；但要自己维护实例 |
| Twikoo | 需要部署（Serverless + 云数据库） | 可匿名 | 支持 | 功能最全，配置最重 |
| Disqus | 不需要 | 第三方账号（无 GitHub） | 支持 | 带广告与追踪脚本，与本站"无追踪、纯静态"的定位冲突 |

要匿名评论（访客不想登录 GitHub）就换 Waline，代价是引入一个需要维护的免费实例；其余场景 Giscus 是最省事的选择。切换方式：改 `CONFIG.comments.provider`，并按需在 `mountComments()` 里加一个分支。

## 数据现状

站点已经接入首批真实图片，数据分两层：

- `dist/data/blue-fish-classification.json` 是从上游公开清单（`EDMOK/blue-fish-archive`）导入的 205 条记录，`app.js` 的 `loadLocalDataset()` 在首屏渲染前读它并用 `mapLocalRecord()` 映射成作品记录；名称、Tag、角色三项齐全的才进入展示，当前是 146 条，其余 59 条留在清单里不展示。
- `dist/data/blue-fish/previews/` 是本站自己托管的 205 张预览图（约 34 MB）。这个目录被 `.gitignore` 排除，不进公开仓库，只存在于本地和服务器。
- 每条记录的 `origin.author` 为空、`license.type` 为 `unknown`，详情页会如实显示「未标注 / 授权状态不明」。**上游清单没有逐条作者与授权信息，这是当前最大的缺口**：收录新条目时要按 `数据契约.md` 补齐 `submitter` / `origin` / `license`。
- 「下载原图」指向 `raw.githubusercontent.com/EDMOK/blue-fish-archive/...` 的上游原始文件（本站只存预览图，不存约 189 MB 的原图）。这是外部依赖，上游改动作废则该链接失效。
- 只有清单读取失败（例如用 `file://` 直接打开）时才会回退到 `app.js` 里的 12 条手写作品与 168 条生成占位作品；这些演示作品没有图片文件，因此不会发出图片请求。

## 目录与发布

仓库默认把 `dist/` 作为静态站点根目录。GitHub Pages、Cloudflare Pages、Netlify 等静态托管均可直接发布该目录。

```text
.
├─ dist/                 # 可直接发布的网站文件
├─ assets/               # favicon 原始图与透明处理版本
├─ tools/                # favicon 处理脚本、发布脚本
├─ 数据契约.md           # 作品、角色、投稿与搜索的数据约定
└─ .github/              # GitHub Issue 投稿模板
```

### 本站的线上发布

正式站在阿里云香港（QuickSite Studio 里的 `aliyun-hk`）以 nginx 静态站点托管，域名是国际化域名
`蓝色大肥鱼.com`（punycode `xn--pssy23gqgbz2d718b.com`），旧域名 `dafeiyu.dshregistry.xyz` 整站 301 过来。
服务器上的布局是发布目录 + 软链：

```text
/srv/www/dafeiyu/
├─ releases/<YYYYmmdd-HHMMSS>/   # 每次发布一个自包含目录
└─ current -> releases/<版本>     # nginx root 指向它，切软链即切版本
```

发布脚本 `tools/deploy.mjs` 留在维护者本机（里面写着服务器路径，不进公开仓库）。它经本地 QuickSite Studio
面板的 `qss` CLI 操作服务器，写命令都会在面板任务中心先显示计划、等人工确认，并落审计日志。等价的四步手工流程：

```bash
tar -czf site.tgz -C dist .                                 # 1. 打包 dist/
qss fs upload site.tgz /srv/www/dafeiyu/<ts>.tgz            # 2. 上传
qss exec "mkdir -p /srv/www/dafeiyu/releases/<ts> \
  && tar -xzf /srv/www/dafeiyu/<ts>.tgz -C /srv/www/dafeiyu/releases/<ts> \
  && ln -sfn /srv/www/dafeiyu/releases/<ts> /srv/www/dafeiyu/current && nginx -t"   # 3. 解包 + 切软链
curl -sI https://xn--pssy23gqgbz2d718b.com/                 # 4. 回读验证
```

新 release 的目录设成 755、文件设成 644；图片目录用 `cp -al` 从上一版硬链接过来，避免每次重传 34 MB。
回滚只要把 `current` 指回上一个 `releases/<ts>`，不删任何文件。

## 开源与版权边界

程序代码以 [MIT License](LICENSE) 发布。`assets/` 中的站点图标是本项目生成的品牌素材；投稿进入站点的表情包不因进入本仓库而自动获得 MIT 授权，具体使用条件以作品详情页的来源与授权信息为准。发现署名、来源或版权问题，可通过 Issue 申请修改或删除。
