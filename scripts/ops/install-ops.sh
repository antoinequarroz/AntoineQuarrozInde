#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run this installer with sudo." >&2
  exit 1
fi

PROJECT_DIR="${1:?Usage: sudo install-ops.sh /absolute/project/path}"
PROJECT_DIR="$(realpath "$PROJECT_DIR")"
[[ -f "$PROJECT_DIR/docker-compose.yml" && -f "$PROJECT_DIR/.env" ]] || { echo "Invalid project directory" >&2; exit 1; }

apt-get update -qq
apt-get install -y -qq age curl jq openssl rclone >/dev/null

cat > /etc/systemd/system/antoinequarroz-monitor.service <<EOF
[Unit]
Description=Antoine Quarroz application health monitor
After=docker.service network-online.target

[Service]
Type=oneshot
ExecStart=$PROJECT_DIR/scripts/ops/monitor.sh $PROJECT_DIR
EOF

cat > /etc/systemd/system/antoinequarroz-monitor.timer <<'EOF'
[Unit]
Description=Check antoinequarroz.ch every five minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
Persistent=true

[Install]
WantedBy=timers.target
EOF

cat > /etc/systemd/system/antoinequarroz-backup.service <<EOF
[Unit]
Description=Backup Antoine Quarroz Supabase data and media
After=network-online.target

[Service]
Type=oneshot
ExecStart=$PROJECT_DIR/scripts/ops/backup-supabase.sh $PROJECT_DIR
EOF

cat > /etc/systemd/system/antoinequarroz-backup.timer <<'EOF'
[Unit]
Description=Daily Antoine Quarroz production backup

[Timer]
OnCalendar=*-*-* 02:30:00 Europe/Zurich
RandomizedDelaySec=10min
Persistent=true

[Install]
WantedBy=timers.target
EOF

chmod 750 "$PROJECT_DIR/scripts/ops/"*.sh
systemctl daemon-reload
systemctl enable --now antoinequarroz-monitor.timer antoinequarroz-backup.timer
systemctl start antoinequarroz-monitor.service
systemctl start antoinequarroz-backup.service
systemctl --no-pager list-timers 'antoinequarroz-*'
