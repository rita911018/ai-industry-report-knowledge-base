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
  if (!apiKey) throw coded('DEEPSEEK_API_KEY is not configured', 'MISSING_API_KEY');
  if (!ALLOWED_MODELS.has(model)) throw coded(`Unsupported model: ${model}`, 'UNSUPPORTED_MODEL');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: '你是研究资料问答助手。仅使用用户提供的 evidence。输出 JSON；每条事实或分析都必须引用有效 chunkId。推断标记为 analysis；证据不足时明确拒答，不得编造来源。',
          },
          { role: 'user', content: JSON.stringify({ question, evidence }) },
        ],
      }),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw coded('DeepSeek request timed out', 'UPSTREAM_TIMEOUT');
    throw coded('DeepSeek request failed', 'UPSTREAM_ERROR', error);
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw coded('DeepSeek authentication failed', 'AUTHENTICATION');
    if (response.status === 429) throw coded('DeepSeek rate limit reached', 'RATE_LIMIT');
    throw coded(`DeepSeek upstream returned HTTP ${response.status}`, 'UPSTREAM_HTTP');
  }
  try {
    const payload = await response.json();
    return JSON.parse(payload.choices[0].message.content);
  } catch (error) {
    throw coded('DeepSeek returned invalid JSON', 'INVALID_RESPONSE', error);
  }
}

export { ALLOWED_MODELS };
