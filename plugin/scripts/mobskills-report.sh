#!/bin/sh
# Resolve a node binary without relying on PATH, then run the reporter.
#
# Why this wrapper exists: hooks.json used to invoke a bare `node`. Claude
# Desktop launches from the GUI with a minimal PATH (/usr/local/bin:/bin:/usr/bin)
# that excludes Homebrew's /opt/homebrew/bin and every nvm install, so `node`
# does not resolve there. A hook that cannot exec looks exactly like a hook that
# does not fire, which cost a full debugging cycle on 2026-08-19.
#
# Contract, same as the reporter's: never fail the turn being observed.
# Every path exits 0.

DIR=$(dirname "$0")

find_node() {
  command -v node 2>/dev/null && return
  for c in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node; do
    [ -x "$c" ] && printf '%s' "$c" && return
  done
  for c in "$HOME"/.nvm/versions/node/*/bin/node; do
    [ -x "$c" ] && printf '%s' "$c" && return
  done
}

NODE=$(find_node)
[ -n "$NODE" ] || exit 0   # no node on this machine: stay silent, never break the session

exec "$NODE" "$DIR/mobskills-report.mjs" "$@"
