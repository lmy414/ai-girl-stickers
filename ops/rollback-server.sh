#!/usr/bin/env bash
#
# ops/rollback-server.sh —— 服务器侧回滚脚本
#
# 用法：ops/rollback-server.sh <release目录名>
#   必须显式给出 releases/ 下的目录名，没有默认值。
#
# 行为：加载同样的配置 -> 校验目标 release 存在 -> 原子切 current -> 健康检查；
#       健康检查失败则把 current 指回原目标并非零退出。
#       不重新构建、不删除任何文件、不动 shared/data、不动 acme。
#
# 这个文件是公开仓库的一部分：不写死域名、IP、凭据或服务器绝对路径。

set -euo pipefail

log() {
  printf '[rollback] %s %s\n' "$(date -Is)" "$*"
}

die() {
  printf '[rollback] %s 错误：%s\n' "$(date -Is)" "$*" >&2
  exit 1
}

if [ "$#" -ne 1 ]; then
  die "用法：$0 <release目录名>（必须显式指定，没有默认值）"
fi
RELEASE_NAME="$1"

case "${RELEASE_NAME}" in
  */*|*..*|"")
    die "release 目录名不合法：${RELEASE_NAME}"
    ;;
esac

# ---------------------------------------------------------------- 配置加载

CONFIG_FILE="${DEPLOY_ENV:-}"
CONFIG_VARS=(DEPLOY_ROOT SOURCE_DIR REPO_URL BRANCH HEALTH_URL SHARED_DATA_DIR RELEASES_DIR CURRENT_LINK)

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

RELEASES_DIR="${RELEASES_DIR:-${DEPLOY_ROOT}/releases}"
CURRENT_LINK="${CURRENT_LINK:-${DEPLOY_ROOT}/current}"
HEALTH_URL="${HEALTH_URL%/}"

RELEASE_PATH="${RELEASES_DIR}/${RELEASE_NAME}"
log "目标 release：${RELEASE_PATH}"

if [ ! -f "${RELEASE_PATH}/index.html" ]; then
  die "目标 release 不存在或缺少 index.html：${RELEASE_PATH}"
fi

OLD_TARGET=""
if [ -L "${CURRENT_LINK}" ]; then
  OLD_TARGET="$(readlink "${CURRENT_LINK}")"
  log "当前 current -> ${OLD_TARGET}"
else
  log "当前没有 current 软链"
fi

if [ "${OLD_TARGET}" = "releases/${RELEASE_NAME}" ]; then
  log "current 已经指向目标 release，无需切换"
fi

# ---------------------------------------------------------------- 防并发

exec 9>"${DEPLOY_ROOT}/.deploy.lock"
if ! flock -n 9; then
  die "另一个发布/回滚正在进行（拿不到 ${DEPLOY_ROOT}/.deploy.lock），退出"
fi
log "已获得发布锁 ${DEPLOY_ROOT}/.deploy.lock"

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
    log "之前没有 current，移除 current 软链"
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
  die "健康检查失败（无预览图可回读），current 已还原"
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
  die "健康检查失败于 ${HEALTH_FAILED}，current 已还原到 ${OLD_TARGET:-（无）}"
fi

log "回滚成功"
log "旧 release：${OLD_TARGET:-（无）}"
log "新 release：releases/${RELEASE_NAME}"
log "健康检查：全部通过（首页 / robots.txt / submissions/works.json / ${PREVIEW_REL}）"

# 注意：绝不删除任何 release、绝不删除 shared/data、绝不删除 acme。
