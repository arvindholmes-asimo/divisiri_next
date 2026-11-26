#!/bin/sh
# Scans the files git would commit (tracked plus untracked, ignoring .gitignore matches).
set -eu

image="ghcr.io/gitleaks/gitleaks:v8.30.1"
root="$(git rev-parse --show-toplevel)"
snapshot="$(mktemp -d)"
trap 'rm -rf "$snapshot"' EXIT

cd "$root"
git ls-files -z --cached --others --exclude-standard | xargs -0 tar -cf - | tar -xf - -C "$snapshot"

docker run --rm -v "$snapshot:/repo:ro" "$image" dir /repo --redact --no-banner
