#!/bin/zsh
set -e
REPORT_APP_DIR="${0:A:h}"
cd "$REPORT_APP_DIR"
echo "DeepSeek API Key 只会保存在本文件夹的 .env.local，不会进入网页或文章归档。"
read -s "REPORT_DEEPSEEK_KEY?请输入 DeepSeek API Key："
echo
if [[ -z "$REPORT_DEEPSEEK_KEY" ]]; then
  echo "未输入，配置未更改。"
  exit 1
fi
printf 'DEEPSEEK_API_KEY=%q\nDEEPSEEK_MODEL=deepseek-v4-flash\n' "$REPORT_DEEPSEEK_KEY" > .env.local
chmod 600 .env.local
echo "配置完成。现在双击“启动知识库.command”。"
