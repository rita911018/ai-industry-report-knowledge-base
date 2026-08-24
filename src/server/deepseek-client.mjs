import { askLlm } from './llm-client.mjs';

const ALLOWED_MODELS = new Set(['deepseek-v4-flash', 'deepseek-v4-pro']);

function coded(message, code, cause) {
  return Object.assign(new Error(message, cause ? { cause } : undefined), { code });
}

export async function askDeepSeek({
  question,
  evidence,
  model = 'deepseek-v4-flash',
  apiKey = process.env.DEEPSEEK_API_KEY,
  fetchImpl = fetch,
  timeoutMs = 90_000,
}) {
  if (!ALLOWED_MODELS.has(model)) throw coded(`Unsupported model: ${model}`, 'UNSUPPORTED_MODEL');
  return askLlm({
    question,
    evidence,
    config: {
      configured: Boolean(apiKey),
      provider: 'deepseek',
      model,
      apiKey,
      endpoint: 'https://api.deepseek.com/chat/completions',
    },
    fetchImpl,
    timeoutMs,
  });
}

export { ALLOWED_MODELS };
