function invalidConfig(message, cause) {
  return Object.assign(new Error(message, cause ? { cause } : undefined), { code: 'INVALID_LLM_CONFIG' });
}

function endpointFor(baseUrl) {
  return `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
}

export function loadLlmConfig(env = process.env) {
  const legacy = !env.LLM_PROVIDER && Boolean(env.DEEPSEEK_API_KEY);
  const provider = String(env.LLM_PROVIDER || (legacy ? 'deepseek' : '')).trim().toLowerCase();
  if (!provider) {
    return {
      configured: false,
      provider: null,
      model: null,
      endpoint: null,
      apiKey: '',
      legacy: false,
    };
  }
  if (!['deepseek', 'qwen'].includes(provider)) {
    throw invalidConfig(`Unsupported LLM provider: ${provider}`);
  }

  const apiKey = String(env.LLM_API_KEY || (legacy ? env.DEEPSEEK_API_KEY : '') || '').trim();
  const model = String(
    env.LLM_MODEL
      || (provider === 'deepseek' ? env.DEEPSEEK_MODEL || 'deepseek-v4-flash' : 'qwen-plus'),
  ).trim();
  const baseUrl = provider === 'deepseek'
    ? String(env.LLM_BASE_URL || 'https://api.deepseek.com').trim()
    : String(env.LLM_BASE_URL || '').trim();
  if (!baseUrl) throw invalidConfig('Qwen requires LLM_BASE_URL');

  let url;
  try {
    url = new URL(baseUrl);
  } catch (cause) {
    throw invalidConfig('LLM_BASE_URL must be a valid URL', cause);
  }
  const qwenHost = url.hostname === 'dashscope.aliyuncs.com' || url.hostname.endsWith('.maas.aliyuncs.com');
  if (url.protocol !== 'https:' || (provider === 'qwen' && !qwenHost)) {
    throw invalidConfig('Qwen requires an official HTTPS Model Studio URL');
  }

  return {
    configured: Boolean(apiKey),
    provider,
    model,
    endpoint: endpointFor(url.href),
    apiKey,
    legacy,
  };
}
