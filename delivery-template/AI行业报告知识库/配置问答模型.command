#!/bin/zsh
set -e
REPORT_APP_DIR="${0:A:h}"
cd "$REPORT_APP_DIR"

echo "问答模型 API Key 只会保存在本文件夹的 .env.local，不会进入网页或文章归档。"
echo "1) DeepSeek"
echo "2) 阿里云百炼千问"
read "REPORT_PROVIDER_CHOICE?请选择供应商（1/2）："

case "$REPORT_PROVIDER_CHOICE" in
  1)
    REPORT_PROVIDER="deepseek"
    REPORT_DEFAULT_MODEL="deepseek-v4-flash"
    REPORT_BASE_URL="https://api.deepseek.com"
    ;;
  2)
    REPORT_PROVIDER="qwen"
    REPORT_DEFAULT_MODEL="qwen-plus"
    REPORT_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
    ;;
  *)
    echo "选择无效，配置未更改。"
    exit 1
    ;;
esac

read -s "REPORT_LLM_KEY?请输入 API Key："
echo
if [[ -z "$REPORT_LLM_KEY" ]]; then
  echo "未输入 API Key，配置未更改。"
  exit 1
fi

read "REPORT_LLM_MODEL?模型名称（直接回车使用 ${REPORT_DEFAULT_MODEL}）："
REPORT_LLM_MODEL="${REPORT_LLM_MODEL:-$REPORT_DEFAULT_MODEL}"

printf 'LLM_PROVIDER=%q\nLLM_API_KEY=%q\nLLM_MODEL=%q\nLLM_BASE_URL=%q\n' \
  "$REPORT_PROVIDER" "$REPORT_LLM_KEY" "$REPORT_LLM_MODEL" "$REPORT_BASE_URL" > .env.local
chmod 600 .env.local
echo "已配置 ${REPORT_PROVIDER} / ${REPORT_LLM_MODEL}。现在双击“启动知识库.command”。"
