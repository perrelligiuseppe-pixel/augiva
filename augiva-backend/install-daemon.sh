#!/bin/bash
set -e
echo "Installazione Augiva Daemon..."
pip3 install psycopg2-binary openai supabase
cp augiva-daemon.service /etc/systemd/system/augiva-daemon.service
touch /var/log/augiva-daemon.log
systemctl daemon-reload
systemctl enable augiva-daemon
systemctl start augiva-daemon
echo "Done! Status: systemctl status augiva-daemon"
