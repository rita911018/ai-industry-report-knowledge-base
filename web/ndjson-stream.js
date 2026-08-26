(() => {
  'use strict';

  async function emitLine(line, onEvent) {
    if (!line.trim()) return;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      throw new Error('问答响应格式无效');
    }
    await onEvent(event);
  }

  async function read(response, onEvent) {
    if (!response?.body?.getReader) throw new Error('问答响应格式无效');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) await emitLine(line, onEvent);
      }
      buffer += decoder.decode();
      await emitLine(buffer, onEvent);
    } finally {
      reader.releaseLock();
    }
  }

  window.NdjsonStream = { read };
})();
