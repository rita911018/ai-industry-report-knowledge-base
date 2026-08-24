function coded(message, code, cause) {
  return Object.assign(new Error(message, cause ? { cause } : undefined), { code });
}

function providerLabel(provider) {
  return provider === 'qwen' ? 'Qwen' : provider === 'deepseek' ? 'DeepSeek' : 'LLM';
}

function buildMessages(question, evidence) {
  return [
    {
      role: 'system',
      content: '你是研究资料问答助手。仅使用用户提供的 evidence。必须输出 JSON 对象；每条事实或分析都必须引用有效 chunkId。推断标记为 analysis；证据不足时明确拒答，不得编造来源。',
    },
    { role: 'user', content: JSON.stringify({ question, evidence }) },
  ];
}

function upstreamError(status, provider) {
  const label = providerLabel(provider);
  if (status === 401 || status === 403) return coded(`${label} authentication failed`, 'AUTHENTICATION');
  if (status === 429) return coded(`${label} rate limit reached`, 'RATE_LIMIT');
  return coded(`${label} upstream returned HTTP ${status}`, 'UPSTREAM_HTTP');
}

export async function askLlm({
  question,
  evidence,
  config,
  fetchImpl = fetch,
  timeoutMs = 90_000,
}) {
  if (!config?.configured || !config.apiKey) {
    throw coded('Question-answering model is not configured', 'MISSING_API_KEY');
  }
  if (!['deepseek', 'qwen'].includes(config.provider) || !config.endpoint || !config.model) {
    throw coded('Question-answering model configuration is invalid', 'INVALID_LLM_CONFIG');
  }

  const requestBody = {
    model: config.model,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: buildMessages(question, evidence),
  };
  if (config.provider === 'qwen') requestBody.enable_thinking = false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(config.endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw coded(`${providerLabel(config.provider)} request timed out`, 'UPSTREAM_TIMEOUT');
    throw coded(`${providerLabel(config.provider)} request failed`, 'UPSTREAM_ERROR', error);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) throw upstreamError(response.status, config.provider);
  try {
    const payload = await response.json();
    const parsed = JSON.parse(payload.choices[0].message.content);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new TypeError('Answer must be a JSON object');
    return parsed;
  } catch (error) {
    throw coded(`${providerLabel(config.provider)} returned invalid JSON`, 'INVALID_RESPONSE', error);
  }
}

export { buildMessages };
