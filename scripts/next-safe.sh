#!/usr/bin/env sh
set -eu

# Prevent broken NODE_OPTIONS (e.g. --localstorage-file) from crashing Next.js runtime.
unset NODE_OPTIONS

exec next "$@"
