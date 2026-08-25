#!/bin/zsh
set -e
REPORT_APP_DIR="${0:A:h}"
cd "$REPORT_APP_DIR"
if [[ -f .env.local ]]; then
  set -a
  source ./.env.local
  set +a
fi
REPORT_APP_URL="http://127.0.0.1:4318"
(sleep 1; open "$REPORT_APP_URL") &
echo "AI 行业报告知识库正在启动：$REPORT_APP_URL"
echo "关闭这个终端窗口即可停止服务。"
node src/server/app-server.mjs --corpus corpus.json --web web --archive work/archive
