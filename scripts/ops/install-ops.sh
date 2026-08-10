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

cat > /etc/systemd/system/antoinequarroz-pipeline-reminders.service <<EOF
[Unit]
Description=Send milestone-based commercial reminders
After=network-online.target

[Service]
Type=oneshot
ExecStart=$PROJECT_DIR/scripts/ops/pipeline-reminders.sh $PROJECT_DIR
EOF

cat > /etc/systemd/system/antoinequarroz-pipeline-reminders.timer <<'EOF'
[Unit]
Description=Check commercial reminder milestones every weekday

[Timer]
OnCalendar=Mon..Fri *-*-* 08:15:00 Europe/Zurich
Persistent=true

[Install]
WantedBy=timers.target
EOF

cat > /etc/systemd/system/antoinequarroz-restore-drill.service <<EOF
[Unit]
Description=Verify latest encrypted offsite backup
After=network-online.target
[Service]
Type=oneshot
ExecStart=$PROJECT_DIR/scripts/ops/scheduled-restore-drill.sh $PROJECT_DIR
EOF

cat > /etc/systemd/system/antoinequarroz-restore-drill.timer <<'EOF'
[Unit]
Description=Monthly offsite restore drill
[Timer]
OnCalendar=Sun *-*-01..07 04:15:00 Europe/Zurich
RandomizedDelaySec=30min
Persistent=true
[Install]
WantedBy=timers.target
EOF

cat > /etc/systemd/system/antoinequarroz-recurring-invoices.service <<EOF
[Unit]
Description=Generate due recurring invoice drafts
After=network-online.target
[Service]
Type=oneshot
ExecStart=$PROJECT_DIR/scripts/ops/recurring-invoices.sh $PROJECT_DIR
EOF

cat > /etc/systemd/system/antoinequarroz-recurring-invoices.timer <<'EOF'
[Unit]
Description=Check recurring invoice schedules daily
[Timer]
OnCalendar=*-*-* 06:30:00 Europe/Zurich
Persistent=true
[Install]
WantedBy=timers.target
EOF

chmod 750 "$PROJECT_DIR/scripts/ops/"*.sh
systemctl daemon-reload
systemctl enable --now antoinequarroz-monitor.timer antoinequarroz-backup.timer antoinequarroz-pipeline-reminders.timer antoinequarroz-restore-drill.timer antoinequarroz-recurring-invoices.timer
systemctl start antoinequarroz-monitor.service
systemctl start antoinequarroz-backup.service
systemctl --no-pager list-timers 'antoinequarroz-*'
