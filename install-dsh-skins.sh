#!/usr/bin/env bash
# install-dsh-skins.sh — one-shot installer for the dsh-client-ui-skins plugin.
#
# Usage:
#   bash install-dsh-skins.sh [path/to/dsh-client-ui-skins-<ver>.tgz]
#
# Defaults to the tarball next to this script whose version matches the
# installed package.json. Detects the active DSH web profile, installs the
# plugin, registers the cordis entry, and restarts the web service.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# resolve the current version from package.json so the default never goes stale
VER="$(node -p "require('$HERE/package.json').version" 2>/dev/null || true)"
TGZ="${1:-$HERE/dsh-client-ui-skins-${VER}.tgz}"

say()  { printf '\033[32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[33m! %s\033[0m\n' "$*"; }
die()  { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ── 1. locate the DSH profile ────────────────────────────────────────────────
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PROFILE="${DSH_PROFILE:-web}"
PROFILE_DIR="$DSH_HOME/profiles/$PROFILE"

[ -f "$TGZ" ] || die "找不到安装包：$TGZ"
[ -f "$PROFILE_DIR/package.json" ] || die "找不到 DSH web profile：$PROFILE_DIR"
grep -q '"@deepseek-ai/dsh-base"' "$PROFILE_DIR/package.json" 2>/dev/null \
  || grep -q 'dsh-profile' "$PROFILE_DIR/package.json" 2>/dev/null \
  || warn "profile 目录看起来不太典型，继续尝试…"

# ── 2. install the package via pnpm (file: tarball) ─────────────────────────
say "安装插件包到 $PROFILE_DIR"
if command -v pnpm >/dev/null 2>&1; then
  ( cd "$PROFILE_DIR" && pnpm add -w "$TGZ" )
elif command -v npm >/dev/null 2>&1; then
  ( cd "$PROFILE_DIR" && npm install "$TGZ" )
else
  die "既没有 pnpm 也没有 npm，无法安装依赖"
fi

# ── 3. register the cordis entry (idempotent) ────────────────────────────────
PATCH="$PROFILE_DIR/cordis.patch.yml"
if grep -q "ui-skins" "$PATCH" 2>/dev/null; then
  say "cordis entry 已存在，跳过注册"
else
  say "注册皮肤插件到 cordis.patch.yml"
  # append an insert entry; keep the existing patch content intact
  {
    if [ -s "$PATCH" ] && [ "$(tail -c 1 "$PATCH" | wc -l)" -eq 0 ]; then
      printf '\n'
    fi
    printf '%s\n' '- insert:'
    printf '%s\n' '    - id: ui-skins'
    printf '%s\n' "      name: 'dsh-client-ui-skins'"
  } >> "$PATCH"
fi

# ── 4. restart the web service ───────────────────────────────────────────────
say "重启 DSH web 服务"
if command -v launchctl >/dev/null 2>&1; then
  # macOS LaunchAgent (com.deepseek.dsh.web) if present
  if launchctl list 2>/dev/null | grep -q 'com.deepseek.dsh.web'; then
    launchctl kickstart -k "gui/$(id -u)/com.deepseek.dsh.web" || warn "重启失败，请手动重启 DSH web"
  else
    warn "未找到 LaunchAgent，请手动重启 DSH web"
  fi
else
  warn "非 macOS 环境，请手动重启 DSH web"
fi

say "完成！刷新 http://127.0.0.1:3080 → 设置 → 通用设置 → 皮肤"
say "卸载：bash $HERE/uninstall-dsh-skins.sh"
