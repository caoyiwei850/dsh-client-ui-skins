#!/usr/bin/env bash
# uninstall-dsh-skins.sh — remove the dsh-client-ui-skins plugin.
#
# Usage:
#   bash uninstall-dsh-skins.sh
set -euo pipefail

say()  { printf '\033[32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[33m! %s\033[0m\n' "$*"; }
die()  { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PROFILE="${DSH_PROFILE:-web}"
PROFILE_DIR="$DSH_HOME/profiles/$PROFILE"

# ── 1. remove the cordis entry ───────────────────────────────────────────────
PATCH="$PROFILE_DIR/cordis.patch.yml"
if [ -f "$PATCH" ] && grep -q "ui-skins" "$PATCH"; then
  say "从 cordis.patch.yml 移除皮肤插件 entry"
  # delete the 3-line insert block for ui-skins
  python3 - "$PATCH" <<'PY'
import sys
path = sys.argv[1]
with open(path) as f:
    lines = f.readlines()
out = []
i = 0
while i < len(lines):
    if lines[i].strip() == '- insert:' and i + 2 < len(lines) and 'ui-skins' in lines[i+2]:
        i += 3  # skip '- insert:' + '- id: ui-skins' + 'name: ...'
        continue
    out.append(lines[i])
    i += 1
with open(path, 'w') as f:
    f.writelines(out)
PY
fi

# ── 2. remove the package ────────────────────────────────────────────────────
say "移除 dsh-client-ui-skins 包"
if command -v pnpm >/dev/null 2>&1; then
  ( cd "$PROFILE_DIR" && pnpm remove dsh-client-ui-skins ) || warn "移除失败（可能已被删除）"
elif command -v npm >/dev/null 2>&1; then
  ( cd "$PROFILE_DIR" && npm uninstall dsh-client-ui-skins ) || warn "移除失败（可能已被删除）"
else
  warn "没有 pnpm/npm，请手动删除依赖"
fi

# ── 3. restart ───────────────────────────────────────────────────────────────
say "重启 DSH web 服务"
if command -v launchctl >/dev/null 2>&1 && launchctl list 2>/dev/null | grep -q 'com.deepseek.dsh.web'; then
  launchctl kickstart -k "gui/$(id -u)/com.deepseek.dsh.web" || warn "重启失败，请手动重启"
else
  warn "请手动重启 DSH web"
fi

say "已卸载。皮肤设置会恢复为默认外观。"
