#!/usr/bin/env bash
#
# ops/deploy-server.sh —— 服务器侧发布脚本（GitHub 驱动）
#
# 流程（顺序固定，不要调换）：
#   1. 加载配置并校验必填变量；
#   2. flock 防并发发布；
#   3. 拉取 origin/<BRANCH> 到 Git 工作树（只动 SOURCE_DIR，不碰 current）；
#   4. staging 临时目录里跑零依赖构建 tools/build.mjs；
#   5. 先 chmod 构建产物，再 cp -al 硬链接 shared/data（顺序不能反）；
#   6. 校验产物关键文件；
#   7. nginx -t；
#   8. 产物 mv 进 releases/<YYYYmmdd-HHMMSS>；
#   9. 原子切 current；
#  10. 健康检查；
#  11. 任一健康检查失败：原子切回旧 current 并非零退出；
#  12. 成功则把四行摘要追加到 logs/deploy.log。
#
# 这个文件是公开仓库的一部分：不写死域名、IP、凭据或服务器绝对路径，
# 全部从环境变量读取；可选由 DEPLOY_ENV 指定一个配置文件。环境变量优先于文件。

set -euo pipefail

log() {
  printf '[deploy] %s %s\n' "$(date -Is)" "$*"
}

die() {
  printf '[deploy] %s 错误：%s\n' "$(date -Is)" "$*" >&2
  exit 1
}

# ---------------------------------------------------------------- 配置加载

CONFIG_FILE="${DEPLOY_ENV:-}"
CONFIG_VARS=(DEPLOY_ROOT SOURCE_DIR REPO_URL BRANCH HEALTH_URL SHARED_DATA_DIR RELEASES_DIR CURRENT_LINK)

# 先记住当前已经通过环境变量给出的值，读完配置文件后再覆盖回去（环境变量优先）。
declare -A __preset=()
for name in "${CONFIG_VARS[@]}"; do
  if [ -n "${!name:-}" ]; then
    __preset[$name]="${!name}"
  fi
done

if [ -n "${CONFIG_FILE}" ] && [ -f "${CONFIG_FILE}" ]; then
  log "加载配置：${CONFIG_FILE}"
  set -a
  # shellcheck disable=SC1090
  . "${CONFIG_FILE}"
  set +a
else
  if [ -n "${CONFIG_FILE}" ]; then
    log "配置文件不存在：${CONFIG_FILE}，只用环境变量"
  else
    log "未提供 DEPLOY_ENV，只用环境变量"
  fi
fi

for name in "${!__preset[@]}"; do
  printf -v "${name}" '%s' "${__preset[$name]}"
done

MISSING=()
for name in DEPLOY_ROOT SOURCE_DIR REPO_URL BRANCH HEALTH_URL; do
  if [ -z "${!name:-}" ]; then
    MISSING+=("${name}")
  fi
done
if [ "${#MISSING[@]}" -gt 0 ]; then
  die "配置缺失，必须提供：${MISSING[*]}"
fi

SHARED_DATA_DIR="${SHARED_DATA_DIR:-${DEPLOY_ROOT}/shared/data}"
RELEASES_DIR="${RELEASES_DIR:-${DEPLOY_ROOT}/releases}"
CURRENT_LINK="${CURRENT_LINK:-${DEPLOY_ROOT}/current}"
STAGING_ROOT="${DEPLOY_ROOT}/.staging"
LOG_DIR="${DEPLOY_ROOT}/logs"
HEALTH_URL="${HEALTH_URL%/}"

log "DEPLOY_ROOT=${DEPLOY_ROOT}"
log "SOURCE_DIR=${SOURCE_DIR}"
log "REPO_URL=${REPO_URL}"
log "BRANCH=${BRANCH}"
log "HEALTH_URL=${HEALTH_URL}"
log "SHARED_DATA_DIR=${SHARED_DATA_DIR}"
log "RELEASES_DIR=${RELEASES_DIR}"
log "CURRENT_LINK=${CURRENT_LINK}"

# ---------------------------------------------------------------- 防并发

mkdir -p "${DEPLOY_ROOT}" "${RELEASES_DIR}" "${STAGING_ROOT}" "${LOG_DIR}"

exec 9>"${DEPLOY_ROOT}/.deploy.lock"
if ! flock -n 9; then
  die "另一个发布正在进行（拿不到 ${DEPLOY_ROOT}/.deploy.lock），退出"
fi
log "已获得发布锁 ${DEPLOY_ROOT}/.deploy.lock"

# ---------------------------------------------------------------- 准备源码

if [ ! -d "${SOURCE_DIR}/.git" ]; then
  log "Git 工作树不存在，开始克隆：${REPO_URL} -> ${SOURCE_DIR}"
  git clone --branch "${BRANCH}" "${REPO_URL}" "${SOURCE_DIR}"
else
  log "拉取最新代码：git fetch --prune origin（工作树 ${SOURCE_DIR}）"
  git -C "${SOURCE_DIR}" fetch --prune origin
  log "重置工作树到 origin/${BRANCH}（只动 SOURCE_DIR，不碰 current）"
  git -C "${SOURCE_DIR}" reset --hard "origin/${BRANCH}"
fi

COMMIT_SHA="$(git -C "${SOURCE_DIR}" rev-parse HEAD)"
COMMIT_SUBJECT="$(git -C "${SOURCE_DIR}" log -1 --pretty=%s)"
log "将要发布的提交：${COMMIT_SHA} ${COMMIT_SUBJECT}"

# ---------------------------------------------------------------- staging

STAMP="$(date +%Y%m%d-%H%M%S)"
STAGING_DIR="${STAGING_ROOT}/${STAMP}-$$"
mkdir -p "${STAGING_DIR}"
log "创建 staging 目录：${STAGING_DIR}"

cleanup_staging() {
  if [ -d "${STAGING_DIR}" ]; then
    log "清理 staging 目录：${STAGING_DIR}"
    rm -rf "${STAGING_DIR}"
  fi
}
trap cleanup_staging EXIT

log "运行构建：node ${SOURCE_DIR}/tools/build.mjs --out ${STAGING_DIR}/site"
if ! node "${SOURCE_DIR}/tools/build.mjs" --out "${STAGING_DIR}/site"; then
  die "构建失败，未改动 current"
fi
log "构建完成：${STAGING_DIR}/site"

# ------------------------------------------------- 权限（必须在 cp -al 之前）

log "设置产物权限：目录 755、文件 644（此时产物里还没有 data）"
find "${STAGING_DIR}/site" -type d -exec chmod 755 {} +
find "${STAGING_DIR}/site" -type f -exec chmod 644 {} +

# 产物根上的 .build-output 是 tools/build.mjs 的内部标记（只给本地构建识别用），
# 不随发布产物上线。必须放在 cp -al 之前删，之后就不能再 chmod / 改动产物了。
rm -f "${STAGING_DIR}/site/.build-output"

if [ ! -d "${SHARED_DATA_DIR}" ]; then
  die "共享数据目录不存在：${SHARED_DATA_DIR}"
fi
log "硬链接共享数据：cp -al ${SHARED_DATA_DIR} ${STAGING_DIR}/site/data"
# 硬链接共享 inode 与权限。这里是 cp -al 之后绝不能再对产物做 chmod -R 的原因：
# 那会顺着硬链接改掉 shared/data 以及所有旧 release 里同一 inode 的权限。
cp -al "${SHARED_DATA_DIR}" "${STAGING_DIR}/site/data"

# ---------------------------------------------------------------- 校验产物

for required in \
  "${STAGING_DIR}/site/index.html" \
  "${STAGING_DIR}/site/data/blue-fish-classification.json" \
  "${STAGING_DIR}/site/submissions/works.json"; do
  if [ ! -f "${required}" ]; then
    die "产物缺少必需文件：${required}"
  fi
done
log "产物校验通过：index.html / data/blue-fish-classification.json / submissions/works.json 均存在"

# ---------------------------------------------------------------- nginx

log "校验 nginx 配置：nginx -t"
if ! nginx -t; then
  die "nginx -t 未通过，未改动 current"
fi

# ---------------------------------------------------------------- 落 release

RELEASE_NAME="${STAMP}"
if [ -e "${RELEASES_DIR}/${RELEASE_NAME}" ]; then
  RELEASE_NAME="${STAMP}-$$"
fi
RELEASE_PATH="${RELEASES_DIR}/${RELEASE_NAME}"

OLD_TARGET=""
if [ -L "${CURRENT_LINK}" ]; then
  OLD_TARGET="$(readlink "${CURRENT_LINK}")"
  log "当前 current -> ${OLD_TARGET}"
else
  log "当前没有 current 软链（首次发布）"
fi

log "把产物移入 release：mv ${STAGING_DIR}/site ${RELEASE_PATH}"
mv "${STAGING_DIR}/site" "${RELEASE_PATH}"

# ---------------------------------------------------------------- 原子切链

log "切换 current：ln -s releases/${RELEASE_NAME} ${CURRENT_LINK}.new && mv -Tf"
ln -s "releases/${RELEASE_NAME}" "${CURRENT_LINK}.new"
mv -Tf "${CURRENT_LINK}.new" "${CURRENT_LINK}"
log "current 现在指向：releases/${RELEASE_NAME}"

restore_current() {
  if [ -n "${OLD_TARGET}" ]; then
    log "回滚 current：指回 ${OLD_TARGET}"
    ln -s "${OLD_TARGET}" "${CURRENT_LINK}.new"
    mv -Tf "${CURRENT_LINK}.new" "${CURRENT_LINK}"
  else
    log "之前没有 current，移除失败的 current 软链"
    rm -f "${CURRENT_LINK}"
  fi
}

# ---------------------------------------------------------------- 健康检查

# 取一张预览图用于回读。必须换算成相对站点根的路径，否则拼出的 URL 会带
# 服务器绝对路径（如 //srv/www/...），落在文档根之外必然 404。
PREVIEW_ABS="$(
  set +o pipefail
  find "${RELEASE_PATH}/submissions/previews" -type f -name '*.webp' 2>/dev/null | sort | head -n 1
)"
PREVIEW_REL="${PREVIEW_ABS#"${RELEASE_PATH}"/}"
if [ -z "${PREVIEW_REL}" ]; then
  log "健康检查失败：release 里找不到 submissions/previews/*.webp"
  restore_current
  die "健康检查失败（无预览图可回读），current 已回滚"
fi

check_ok() {
  local url="$1" expected_len="${2:-0}"
  local result code size
  result="$(curl -sS -o /dev/null -w '%{http_code} %{size_download}' --max-time 20 "${url}" || echo '000 0')"
  code="${result%% *}"
  size="${result##* }"
  if [ "${code}" != "200" ]; then
    log "健康检查失败：${url} 返回 ${code}"
    return 1
  fi
  if [ "${expected_len}" -gt 0 ] && [ "${size}" -le 0 ]; then
    log "健康检查失败：${url} 内容长度为 0"
    return 1
  fi
  log "健康检查通过：${url} -> 200（${size} bytes）"
  return 0
}

HEALTH_FAILED=""
for path in "/" "/robots.txt" "/submissions/works.json"; do
  if ! check_ok "${HEALTH_URL}${path}"; then
    HEALTH_FAILED="${HEALTH_URL}${path}"
    break
  fi
done

if [ -z "${HEALTH_FAILED}" ]; then
  if ! check_ok "${HEALTH_URL}/${PREVIEW_REL}" 1; then
    HEALTH_FAILED="${HEALTH_URL}/${PREVIEW_REL}"
  fi
fi

if [ -n "${HEALTH_FAILED}" ]; then
  restore_current
  die "健康检查失败于 ${HEALTH_FAILED}，current 已回滚到 ${OLD_TARGET:-（无）}"
fi

# 统计命令只用于收尾日志，放在健康检查通过之后且非致命：
# 万一失败也不能让 current 停在未验证的新版本上（此时健康检查已经过了，
# 但绝不能因为这行让 set -e 提前退出而跳过任何后续收尾）。
PUBLISHED_COUNT="$(node -e 'const a=require(process.argv[1]);console.log(a.filter(r=>r.status==="published").length)' "${RELEASE_PATH}/submissions/works.json" 2>/dev/null)" || PUBLISHED_COUNT="unknown"
log "构建产物 published 记录数：${PUBLISHED_COUNT}"

# ---------------------------------------------------------------- 成功收尾

OLD_DISPLAY="${OLD_TARGET:-（无，首次发布）}"
log "发布成功"
log "旧 release：${OLD_DISPLAY}"
log "新 release：releases/${RELEASE_NAME}"
log "提交：${COMMIT_SHA}"
log "健康检查：全部通过（首页 / robots.txt / submissions/works.json / ${PREVIEW_REL}）"

{
  printf '%s old_release=%s new_release=%s commit=%s health=ok published=%s\n' \
    "$(date -Is)" "${OLD_DISPLAY}" "releases/${RELEASE_NAME}" "${COMMIT_SHA}" "${PUBLISHED_COUNT}"
} >> "${LOG_DIR}/deploy.log"
log "已追加记录到 ${LOG_DIR}/deploy.log"

# 注意：绝不删除任何 release、绝不删除 shared/data、绝不删除 acme。
