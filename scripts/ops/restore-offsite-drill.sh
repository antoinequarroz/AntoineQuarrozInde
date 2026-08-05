#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:?Usage: restore-offsite-drill.sh remote:path /path/to/age-identity.txt [project-dir]}"
IDENTITY="${2:?Usage: restore-offsite-drill.sh remote:path /path/to/age-identity.txt [project-dir]}"
PROJECT_DIR="${3:-$(pwd)}"

[[ -f "$IDENTITY" ]] || { echo "Age identity not found: $IDENTITY" >&2; exit 1; }
command -v age >/dev/null || { echo "age is required" >&2; exit 1; }
command -v rclone >/dev/null || { echo "rclone is required" >&2; exit 1; }

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

LATEST="$(rclone lsf "$REMOTE" --files-only | grep '\.tar\.gz\.age$' | sort | tail -n 1)"
[[ -n "$LATEST" ]] || { echo "No encrypted backup found in $REMOTE" >&2; exit 1; }

rclone copyto "${REMOTE%/}/$LATEST" "$WORK_DIR/$LATEST" --no-traverse
rclone copyto "${REMOTE%/}/$LATEST.sha256" "$WORK_DIR/$LATEST.sha256" --no-traverse

EXPECTED="$(awk '{print $1}' "$WORK_DIR/$LATEST.sha256")"
ACTUAL="$(sha256sum "$WORK_DIR/$LATEST" | awk '{print $1}')"
[[ "$EXPECTED" == "$ACTUAL" ]] || { echo "Encrypted backup checksum mismatch" >&2; exit 1; }

ARCHIVE="$WORK_DIR/${LATEST%.age}"
age --decrypt --identity "$IDENTITY" --output "$ARCHIVE" "$WORK_DIR/$LATEST"
"$PROJECT_DIR/scripts/ops/restore-drill.sh" "$ARCHIVE" "$PROJECT_DIR"

echo "Offsite restore drill passed: $LATEST"
