import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('../delivery-template/AI行业报告知识库/', import.meta.url);

test('desktop launcher keeps the API key server-side', async () => {
  const [launcher, configure, instructions] = await Promise.all([
    readFile(new URL('启动知识库.command', root), 'utf8'),
    readFile(new URL('配置DeepSeek.command', root), 'utf8'),
    readFile(new URL('使用说明.md', root), 'utf8'),
  ]);
  assert.match(launcher, /source \.\/\.env\.local/);
  assert.match(launcher, /--archive \.\./);
  assert.match(configure, /chmod 600 \.env\.local/);
  assert.match(instructions, /不会发送到浏览器/);
  assert.doesNotMatch(`${launcher}\n${configure}`, /sk-[A-Za-z0-9]{12,}/);
});
