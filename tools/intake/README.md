# 投稿收录中转与站长管理 API

这组脚本是**内容侧 / 运维侧**的中转服务，不是前端功能，也不是公开上传接口。

它解决的是：

```text
本地图片 / GitHub Issue 附件 / 后续飞书适配器
（投稿者只填图片、名称、角色、可选说明）
          ↓
服务器外部中转区（不进 git，不进 dist，不进发布产物）
          ↓ 维护者看图、补字段、跑派生图、写入清单
提交内容仓 main → 服务器 fetch/reset → 回源 sha256 校验
          ↓
确认 main 上的原图与中转副本一致后，才允许清理中转副本
```

`main` 仍然是唯一公开内容真源。中转区不是作品数据库，不能直接被站点读取。

## 目录与安全边界

默认中转根目录是**内容仓库同级目录**：

```text
/srv/www/dafeiyu/content       # CONTENT_DIR，git 工作树
/srv/www/dafeiyu/dafeiyu-intake # INTAKE_ROOT，服务私有中转区
```

也可以用 `INTAKE_ROOT` 显式指定，但它必须在内容仓库目录之外；如果配到内容仓库内部，脚本会拒绝启动，避免被 `git reset --hard` 或误提交影响。中转区里有：

```text
inbox/   <sha256>.<ext>         原图字节
meta/    <sha256>.json          投稿字段、来源、状态、目标路径
logs/    intake.log             追加式操作记录
```

硬性规则：

- 不写 `dist/`、`blue-fish-originals/` 或任何 git 工作树；
- 原图按 SHA-256 命名，不使用投稿者文件名作为磁盘路径；
- 接收时做大小限制、文件头格式识别和扩展名一致性检查；
- `targetPath` 只能指向 `dist/submissions/originals/`、`owner-picks/` 或 `blue-fish-originals/`，不能是绝对路径，也不能穿越 `..`；
- 管理 API 默认只监听 `127.0.0.1`，必须有 Bearer 令牌；不要用 Nginx 反代到公网；
- `prune` 默认是报告模式，只有明确加 `--apply` 才删；
- 自动清理只看 `origin/main`：按已发布清单的 `sha256` 找到路径，再从 git blob 读取并重新计算 SHA-256。路径不存在、清单不一致或无法确认时一律保留。

## 本地 CLI

从本仓库根目录执行：

```bash
# 维护者本地上传。默认进入仓库同级的 ../dafeiyu-intake
node tools/intake/cli.mjs add ./图片.png \
  --name "不是……而是……大学习" \
  --character deepseek \
  --description "用于表达质疑或无语"

# Tag、分类、来源、授权和正文由维护者收录时补齐

# 指定未来要收录的原图路径（只记元数据，不会写这个路径）
node tools/intake/cli.mjs add ./图片.png \
  --target dist/submissions/originals/deepseek/my-image.png

# 通过 SSH 隧道把本地图片直接传到服务器中转区
INTAKE_API_URL=http://127.0.0.1:8787 \
INTAKE_API_TOKEN="$INTAKE_API_TOKEN" \
node tools/intake/cli.mjs upload ./图片.png \
  --name "作品名" --character deepseek --description "可选说明"

# 查看中转记录
node tools/intake/cli.mjs list
node tools/intake/cli.mjs list --status staged --json
node tools/intake/cli.mjs show <sha256>
node tools/intake/cli.mjs export <sha256> --out ./review
```

如果图片的 SHA-256 已经在 `origin/main` 的 `dist/submissions/works.json` 或
`dist/owner-picks/works.json` 中，`add` 会返回 `published`，不会再制造中转副本。

## GitHub Issue 附件

需要服务器上的内容仓先有 `origin/main`：

```bash
git -C "$CONTENT_DIR" fetch --prune origin

# 拉取所有带 sticker-submission 标签的开放 Issue
INTAKE_CONTENT_DIR="$CONTENT_DIR" \
INTAKE_ROOT=/srv/www/dafeiyu/dafeiyu-intake \
INTAKE_GITHUB_TOKEN="$GITHUB_READ_TOKEN" \
node tools/intake/cli.mjs pull-issues

# 只拉一个 Issue
node tools/intake/cli.mjs pull-issues --issue 123
```

当前实现支持 `INTAKE_GITHUB_TOKEN` / `GITHUB_TOKEN` 环境变量。生产环境不要把令牌写进命令历史，建议由 systemd `EnvironmentFile` 或受限权限的凭据文件注入。令牌只需能读取仓库 Issue；不要给写仓库权限。

Issue 的幂等键是 `Issue number + attachment asset id`，重复轮询不会重复下载。同一图片如果已经在 main，也会直接返回 `published`。

## 人工收录顺序

中转服务不会自动把未审核图片写进仓库。维护者仍然按内容仓的既有流程人工收录：

1. `list` / `export` 后逐张看图；
2. 按 `sha256` 查重，决定是 `submissions` 还是 `owner-picks`；
3. 原图复制到目标目录，补至少一个 Tag、分类、来源、授权和 `commentary` 等清单字段；
4. 跑 `prepare_works.mjs`、`generate_image_derivatives.py` 和契约校验；
5. 确认公开记录达到展示门槛后，提交并推送 `main`；
6. 服务器拉取最新内容仓；
7. 回源验证，再清理已确认进入 `main` 的中转副本。

### 回源验证与清理

```bash
# 只读报告：不会删除
node tools/intake/cli.mjs verify

# 等确认报告里都是已经推送到 main 的原图后，才执行删除
node tools/intake/cli.mjs prune --apply

# 审核不通过或明确不要的图，人工单独丢弃
node tools/intake/cli.mjs drop <sha256> --reason "重复投稿"
```

`verify` 使用的是当前 `INTAKE_REF`，默认 `origin/main`。如果本地工作树刚推送过，先 `git fetch --prune origin`，不要用未推送的工作区文件冒充回源证据。

## 管理 API

这是给站长后续管理面板、脚本和飞书适配器调用的**内部 API 包装**，不是给访客用的公共 API。

启动前必须设置令牌；服务默认只监听回环：

```bash
export INTAKE_API_TOKEN="$(openssl rand -hex 32)"
export INTAKE_CONTENT_DIR=/srv/www/dafeiyu/content
export INTAKE_ROOT=/srv/www/dafeiyu/dafeiyu-intake
node tools/intake/http.mjs
```

从本机通过 SSH 隧道访问服务器：

```bash
ssh -N -L 8787:127.0.0.1:8787 user@server
curl -H "Authorization: Bearer $INTAKE_API_TOKEN" \
  http://127.0.0.1:8787/api/v1/items
```

接口摘要：

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/v1/health` | 读取服务和内容仓配置摘要 |
| `GET` | `/api/v1/items?status=staged` | 列出中转记录 |
| `GET` | `/api/v1/items/<sha256>` | 读取一条元数据 |
| `GET` | `/api/v1/items/<sha256>/raw` | 以附件方式下载中转原图 |
| `PUT` | `/api/v1/items?filename=x.png&name=...&character=...&tags=a,b` | 以裸字节上传一张图 |
| `POST` | `/api/v1/pull-issues` | 拉取 Issue 附件；JSON 可传 `{"issue":123}` |
| `GET` | `/api/v1/verify` | 回源校验可清理记录 |
| `POST` | `/api/v1/prune` | JSON `{"apply":false}`；`true` 才删除 |
| `POST` | `/api/v1/drop` | JSON `{"sha256":"...","reason":"..."}` |

`PUT` 上传只接受 `INTAKE_MAX_BYTES`（默认 16 MiB）以内的 PNG/JPEG/GIF/WebP 字节；API 层不接受 multipart，也不替前端做匿名投稿表单。API 永远只监听回环地址，不能通过 `INTAKE_API_HOST` 改成公网地址。以后接飞书，只需把飞书附件下载后调用同一个 `stageBuffer` / `PUT` 入口，核心查重和清理规则不变。

## systemd 示例

下面只是服务器侧模板，**不提交真实令牌**。把它复制到服务器并按实际 Node 路径、用户和内容仓路径调整；`INTAKE_ROOT` 必须位于 git 工作树之外：

```ini
[Unit]
Description=Blue Fish intake management API
After=network-online.target

[Service]
Type=simple
User=dafeiyu
Group=dafeiyu
WorkingDirectory=/srv/www/dafeiyu/content
Environment=INTAKE_CONTENT_DIR=/srv/www/dafeiyu/content
Environment=INTAKE_ROOT=/srv/www/dafeiyu/dafeiyu-intake
Environment=INTAKE_API_HOST=127.0.0.1
Environment=INTAKE_API_PORT=8787
EnvironmentFile=/etc/dafeiyu/intake.env
# /etc/dafeiyu/intake.env 至少包含：INTAKE_API_TOKEN=<随机 32 字节令牌>
ExecStart=/usr/bin/node /srv/www/dafeiyu/content/tools/intake/http.mjs
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/srv/www/dafeiyu/dafeiyu-intake
ReadOnlyPaths=/srv/www/dafeiyu/content

[Install]
WantedBy=multi-user.target
```

`ProtectSystem=strict` / `ReadOnlyPaths` 是额外防线；如果服务器上的 Node、git 或发布脚本需要不同权限，先在 staging 环境验证。服务本身不会自动提交 GitHub、不会自动合并 PR、不会自动发布站点。

## 配置变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `INTAKE_CONTENT_DIR` | 当前仓库根 | 内容仓库，用于读 `origin/main` 清单和 blob |
| `INTAKE_ROOT` | 内容仓库同级 `dafeiyu-intake` | 私有中转根目录 |
| `INTAKE_GITHUB_REPO` | `lmy414/ai-girl-stickers` | Issue 来源仓库 |
| `INTAKE_GITHUB_TOKEN` | 空 | GitHub 只读令牌；空值使用匿名 API |
| `INTAKE_REF` | `origin/main` | 回源校验基准；不要指向未推送工作树 |
| `INTAKE_MAX_BYTES` | `16777216` | 单图大小上限 |
| `INTAKE_API_TOKEN` | 无 | 管理 API 必填 Bearer 令牌 |
| `INTAKE_API_HOST` | `127.0.0.1` | 只允许回环监听 |
| `INTAKE_API_PORT` | `8787` | 管理 API 端口 |

生产环境还应给中转目录做磁盘配额和备份；这部分属于服务器运维配置，不写进公开仓库。
