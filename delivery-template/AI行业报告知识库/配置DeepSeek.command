#!/bin/zsh
set -e
REPORT_APP_DIR="${0:A:h}"
echo "配置入口已升级为 DeepSeek / 千问可切换模式。"
exec "$REPORT_APP_DIR/配置问答模型.command"
