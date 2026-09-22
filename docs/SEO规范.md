# 蓝色大肥鱼 · 作品详情页 SEO 规范（长尾版）

> 状态：正式版依据（2026-09-23 入库）。核心原则：**标题、描述、alt 都要接住用户真实的搜索关键词意图**——用户搜的是「deepseek 表情包」「蓝色大肥鱼 梗图」「AI娘 表情包下载」「deepseek娘 立绘」这类长短语，不是「二创表情包开放档案」这类自说自话。详情页 SEO 口径唯一依据本篇，生成器（`tools/generate_work_pages.mjs`）与前端按本篇渲染。

每张作品一个**独立静态详情页**。记号：`{name}` 作品名、`{characterId}` 角色 ID、`{characterName}` 角色展示名、`{aliases}` 角色别名串（顿号连接）、`{tags}` 作品标签、`{slug}` 见 §1、`{kindWord}` 作品类型词（见下）。

**`{kindWord}` 映射**（按 `categoryIds` 首项）：`meme`→「表情包」、`illustration`→「二创插画」、`setting`→「立绘设定图」。

## 0. 长尾关键词地图（文案围绕这张图写）

| 词类 | 词例 | 落点 |
|---|---|---|
| 角色词 | deepseek、DeepSeek 娘、蓝色大肥鱼、鲸鱼娘、GLM 娘、智谱 | title / description / alt / keywords / 正文 |
| 品类词 | 表情包、梗图、meme、二创、同人图、立绘、设定图、头像 | title / description / alt |
| 意图词 | 下载、原图、高清、免费、合集、大全 | description / 正文 |
| 场景词 | 作品自己的 tags（吐槽、打工人、token……） | description / alt / 正文 |
| 品牌词 | 蓝色大肥鱼 | title 尾巴 / description |

长尾组合示例（每页自然覆盖其中若干）：`{角色名} 表情包下载`、`{别名} 梗图`、`{作品名} 表情包`、`{角色名} {场景词} 表情包`、`AI娘 二创 同人图`、`{角色名} 立绘`。

## 1. URL（后缀 = 角色名 + 投稿编号）

```
https://xn--pssy23gqgbz2d718b.com/works/<slug>
```

- **slug 公式**：`<characterId><YYYYMMDD><NNNN>`（角色 ID 小写 + 收录日期 + 当日该角色 4 位序号，按收录时间升序编）。示例：`deepseek202609220001`。
- slug **确定性生成、一经发布即冻结**；数据主键仍是 `id`（`sticker_*`），Giscus term 保持 `sticker-<id>`，与 URL 解耦。
- 路径口径：`works/<slug>` 无扩展名，以线上为准；页面构建期生成。

## 2. `<title>`（接住主搜索意图，25–32 字，≤60 字符）

```
《{name}》{characterName}{kindWord} - {tag1}AI娘二创 | 蓝色大肥鱼
```

- 无 tag 时中段换「AI娘二创表情包」；超长时截中段，**作品名 + 角色名 + 品类词必保**。
- 渲染例：`《分我点token》DeepSeek娘表情包 - tokenAI娘二创 | 蓝色大肥鱼`。
- 变体钩子：角色有别名时，可轮换把 `{tag1}` 换成 `{alias1}`（如「蓝色大肥鱼表情包」），同一角色下交替使用，扩大长尾面。

## 3. `<meta name="description">`（120–160 字，多长尾自然句）

```
《{name}》{characterName}二创{kindWord}{（又称{aliases}）}，主题：{tags顿号}。适合「{tag1}」「{tag2}」相关的聊天斗图、日常吐槽场景，可查看高清大图、免费下载原图。更多{characterName}表情包、{alias1}梗图、AI娘二创同人图与立绘设定，尽在蓝色大肥鱼开放档案。
```

- 渲染例：`《分我点token》DeepSeek娘二创表情包（又称蓝色大肥鱼、鲸鱼娘），主题：token、打工人。适合「token」「打工人」相关的聊天斗图、日常吐槽场景，可查看高清大图、免费下载原图。更多DeepSeek娘表情包、蓝色大肥鱼梗图、AI娘二创同人图与立绘设定，尽在蓝色大肥鱼开放档案。`
- 无别名省略括号段；无 tag 时场景句换「聊天斗图、日常吐槽都能用」；`{alias1}` 无则用「AI娘」。

## 4. `<meta name="keywords">`（长尾组合，8–12 个）

```
{name},{characterName}表情包,{characterName}{kindWord},{alias1}表情包,{tags各一},AI娘表情包,AI娘二创,{kindWord}下载
```

保留给百度等中文引擎；tag 多时取前 5。

## 5. Open Graph / Twitter（分享卡片）

| 属性 | 值 |
|---|---|
| `og:type` | `article` |
| `og:title` | 同 `<title>` |
| `og:description` | 同 meta description |
| `og:url` | canonical（punycode 域名） |
| `og:image` | 详情显示图 `displayUrl` |
| `og:site_name` | 蓝色大肥鱼 |
| `twitter:card` | `summary_large_image` |

## 6. canonical 与 robots

- `<link rel="canonical" href="https://xn--pssy23gqgbz2d718b.com/works/<slug>" />`
- `<meta name="robots" content="index,follow">`

域名在脚本、日志与 `og:url` 里一律 punycode。

## 7. 图片与 alt（图片搜索 SEO 的关键）

**每张可检索图都要有关键词式 alt**，让百度图片 / Google 图片能按「角色名 + 品类 + 场景」召回：

| 图 | alt 公式 |
|---|---|
| 详情主图 | `《{name}》{characterName}{kindWord}，{tags顿号}AI娘二创图` |
| 相关作品缩略图 | 同公式（用对方作品的各字段） |
| 列表卡片图（首页/分类） | 同公式 |
| 纯装饰图 | `alt=""` 且 `aria-hidden="true"` |

- 渲染例：`《分我点token》DeepSeek娘表情包，token、打工人AI娘二创图`。
- 主图放在 `<figure>` 里，配 `<figcaption>`（`《{name}》· {characterName}`）——图旁的可见文本同样喂给图片检索。
- `<img>` 带 `width`/`height`（防布局偏移，利于图片质量评估）；主图 `loading="eager"`，列表图 `loading="lazy"`。
- **图片文件名也参与图片 SEO**：派生图沿用现状文件名，由 alt / figcaption 补语义；语义化文件名（`<slug>.webp`）仍是建议项。图片 sitemap 可后续补。

## 8. 正文长尾段（每页一段，紧跟 H1——长尾流量的主承接）

```
《{name}》是{characterName}{（又称{aliases}）}的二创{kindWord}，画面围绕「{tags顿号}」展开，适合{tag1}{tag2}相关的聊天斗图与日常表达。本站提供{characterName}表情包高清查看与原图免费下载，收录了{alias1}梗图、AI娘二创同人图、{角色名}立绘设定等{count}件作品，欢迎按角色与分类浏览。
```

无别名/tag 时对应段落收缩；句子允许模板化，但**必须读起来像人话**，不堆砌。

## 9. 标题层级 H1 / H2 / H3

| 元素 | 内容 | 数量 |
|---|---|---:|
| `h1` | 《{name}》（唯一） | 1 |
| `h2` | 「作品信息」「评论」「更多{characterName}表情包」（同角色推荐——本身就是长尾词）「猜你喜欢」（跨角色相关推荐） | 4 |
| `h3` | 推荐卡片名 | ≥0 |

推荐区两块：同角色优先（`更多{characterName}表情包`，至多 4 张）；跨角色相关（`猜你喜欢`，共同 tag 优先 + 固定种子随机补足 4 张）。**每页必须有推荐**：孤品角色第一块显示便签提示、第二块照常补足。

角色名不进 H1，进 title/description/alt/正文/H2。

## 10. 结构化数据（JSON-LD，`ImageObject`）

```json
{
  "@context": "https://schema.org",
  "@type": "ImageObject",
  "name": "{name}",
  "description": "{description}",
  "contentUrl": "{displayUrl}",
  "thumbnailUrl": "{thumbUrl}",
  "uploadDate": "{createdAt ISO}",
  "creator": { "@type": "Person", "name": "{来源作者或提交者}" },
  "license": "{授权说明}",
  "keywords": "{tags}",
  "genre": "{kindWord}"
}
```

## 11. 面包屑导航

`nav[aria-label="面包屑"]`：全部作品 → `{characterName}`（链分类页）→ 《{name}》（末项纯文本）。

## 迁移要点

1. `/works/<slug>` 真实路径随本轮落地，OG 分享卡与 SEO 由此成立（架构边界待决事项「每作品静态页 + OG 分享卡」关闭）。
2. Giscus 映射保持 `specific` / `sticker-<id>`（term 用 id 不用 slug）。
3. 旧链接 `#/work/<id>` 重定向到 `/works/<slug>` 过渡一段时间。
4. 长尾文案公式的渲染器集中在生成器一处（`tools/generate_work_pages.mjs`），改公式只改一处。
