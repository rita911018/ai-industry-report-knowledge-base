const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

const defaultSleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function fetchPage(
  url,
  {
    attempts = 4,
    timeoutMs = 30_000,
    sleep = defaultSleep,
    fetchImpl = fetch,
  } = {},
) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'user-agent':
            'Mozilla/5.0 (compatible; AI-Industry-Report-Archiver/1.0; +local-research-archive)',
        },
      });

      const body = await response.text();
      if (response.ok) {
        return {
          body,
          status: response.status,
          attempts: attempt,
          finalUrl: response.url || url,
          contentType: response.headers.get('content-type') || '',
          retrievedAt: new Date().toISOString(),
        };
      }

      const error = new Error(`HTTP ${response.status}: ${url}`);
      error.status = response.status;
      if (!RETRYABLE_STATUS_CODES.has(response.status)) {
        throw error;
      }
      lastError = error;
    } catch (error) {
      if (
        Number.isInteger(error.status) &&
        !RETRYABLE_STATUS_CODES.has(error.status)
      ) {
        throw error;
      }
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < attempts) {
      await sleep(500 * 2 ** (attempt - 1));
    }
  }

  const detail = lastError?.message || 'unknown error';
  throw new Error(`Fetch failed after ${attempts} attempts: ${url} (${detail})`);
}
