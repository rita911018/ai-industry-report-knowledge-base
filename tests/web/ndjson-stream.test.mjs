import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { JSDOM } from 'jsdom';

const script = await readFile(new URL('../../web/ndjson-stream.js', import.meta.url), 'utf8');

function responseFrom(chunks) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }));
}

test('parses NDJSON across arbitrary network chunk boundaries', async () => {
  const dom = new JSDOM('', { runScripts: 'outside-only' });
  dom.window.TextDecoder = TextDecoder;
  dom.window.eval(script);
  const seen = [];
  await dom.window.NdjsonStream.read(responseFrom([
    '{"type":"status","stage":"retr',
    'ieving"}\n{"type":"section","section":{"heading":"结论","body":"内容"}}\n{"type":"done"}',
  ]), (event) => seen.push(event));
  assert.deepEqual(JSON.parse(JSON.stringify(seen)), [
    { type: 'status', stage: 'retrieving' },
    { type: 'section', section: { heading: '结论', body: '内容' } },
    { type: 'done' },
  ]);
  dom.window.close();
});

test('rejects malformed lines with a generic safe message', async () => {
  const dom = new JSDOM('', { runScripts: 'outside-only' });
  dom.window.TextDecoder = TextDecoder;
  dom.window.eval(script);
  await assert.rejects(
    () => dom.window.NdjsonStream.read(responseFrom(['{"secret":"do-not-show"\n']), () => {}),
    (error) => error.message === '问答响应格式无效' && !error.message.includes('do-not-show'),
  );
  dom.window.close();
});
