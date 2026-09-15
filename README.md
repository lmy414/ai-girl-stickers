# AI 娘图鉴 · AI 娘二创表情包开放档案

收集不同 AI 角色拟人化二创表情包的开放图鉴。按角色浏览，按名称、描述、Tag、角色别名和提交者进行模糊搜索；每张作品有独立详情页，支持原图下载、复制链接和 GitHub Issue 投稿。

本站是非官方同人整理项目，与任何 AI 产品官方无关。图片版权归原作者所有；仓库中的程序代码与投稿图片的授权状态分开处理。

公开仓库：[github.com/lmy414/ai-girl-stickers](https://github.com/lmy414/ai-girl-stickers)

纯静态前端：无构建、无依赖、无后端。直接托管 `dist/` 目录即可。

```
dist/
  index.html    壳层：顶栏、页脚、主题引导脚本
  tokens.css    设计 Token（原始值 + 语义层，深浅两套主题）
  styles.css    组件与页面样式（只消费 Token，不写死色值）
  app.js        数据、路由、视图、评论区适配
数据契约.md      字段定义、投稿校验、授权类型
```

## 本地预览

```bash
python -m http.server 5173 -d dist
# 打开 http://127.0.0.1:5173
```

必须用 http 打开才能看到评论区：Giscus 在 `file://` 下没有合法 Origin，加载会被拒绝。用 `file://` 直接打开 `index.html` 只能看版式。

## 投稿

首页右上角的「提交作品」按钮会打开本仓库的 GitHub Issue 新建页。在 Issue 中选择「表情包投稿」模板，填写信息并直接拖入图片即可。

建议填写：

- 图片名称、角色和自由 Tag；
- 提交者与来源类型；
- 来源作者、来源链接（可选）；
- 授权说明，并确认自己有权投稿。

来源链接不是必填项，自己生成或没有公开出处的作品也可以投稿，但仍需要如实填写来源和授权状态。维护者审核后才会进入公开数据。

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

作品占位图的配色（`--art-*`）也定义在 Token 里；导出示例图时会从 CSS 变量读色值，避免在 JS 里重复一份色板。

## 评论接入

**结论：用 Giscus。** 它把评论存在 GitHub Discussions 里，静态站点无需任何服务器、数据库或运维，与本站已有的 GitHub 投稿流程同源。

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

- `app.js` 里的 12 条作品是**演示数据**，字段结构已与 `数据契约.md` 对齐（`submitter` / `origin` / `license` 都是对象），可直接替换成构建产物；另有 168 条生成出来的占位作品，见上面「演示数据说明」。
- 图片资源尚未接入：列表与详情页显示的是按角色与尺寸生成的占位图。接真实图片时，把 `artMarkup()` 换成 `<img src="${sticker.thumbnailPath}" alt="…">`，并删掉数据里的 `tone` / `symbol` 两个占位字段，布局不需要改。
- 详情页"下载原图"当前导出的是占位 SVG（颜色取自 Token）。真实图片接入后改成直接下载 `sticker.path`，并同步改掉 `downloadSticker()` 里的提示文案。
- `CONFIG.repositoryUrl` 已指向本仓库的 Issue 新建页；如果派生此项目，请改成自己的公开仓库地址。

## 目录与发布

仓库默认把 `dist/` 作为静态站点根目录。GitHub Pages、Cloudflare Pages、Netlify 等静态托管均可直接发布该目录。

```text
.
├─ dist/                 # 可直接发布的网站文件
├─ assets/               # favicon 原始图与透明处理版本
├─ tools/                # favicon 处理脚本
├─ 数据契约.md           # 作品、角色、投稿与搜索的数据约定
└─ .github/              # GitHub Issue 投稿模板
```

## 开源与版权边界

程序代码以 [MIT License](LICENSE) 发布。`assets/` 中的站点图标是本项目生成的品牌素材；投稿进入站点的表情包不因进入本仓库而自动获得 MIT 授权，具体使用条件以作品详情页的来源与授权信息为准。发现署名、来源或版权问题，可通过 Issue 申请修改或删除。
