import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('../delivery-template/AI行业报告知识库/', import.meta.url);

test('desktop launcher keeps switchable model credentials server-side', async () => {
  const [launcher, configure, legacyConfigure, instructions, page] = await Promise.all([
    readFile(new URL('启动知识库.command', root), 'utf8'),
    readFile(new URL('配置问答模型.command', root), 'utf8'),
    readFile(new URL('配置DeepSeek.command', root), 'utf8'),
    readFile(new URL('使用说明.md', root), 'utf8'),
    readFile(new URL('web/index.html', root), 'utf8'),
  ]);
  assert.match(launcher, /source \.\/\.env\.local/);
  assert.match(launcher, /node src\/server\/app-server\.mjs --corpus corpus\.json --web web --archive work\/archive(?:\s|$)/);
  assert.doesNotMatch(launcher, /--archive \.\.(?:\s|$)/);
  assert.match(configure, /chmod 600 \.env\.local/);
  assert.match(configure, /LLM_PROVIDER/);
  assert.match(configure, /deepseek/);
  assert.match(configure, /qwen/);
  assert.match(configure, /LLM_BASE_URL/);
  assert.match(legacyConfigure, /配置问答模型\.command/);
  assert.match(instructions, /DeepSeek 或千问/);
  assert.match(instructions, /不会发送到浏览器/);
  assert.doesNotMatch(`${launcher}\n${configure}\n${legacyConfigure}`, /sk-[A-Za-z0-9]{12,}/);
  assert.doesNotMatch(page, /答案只基于已归档全文，并逐条标注出处。没有足够证据时，系统会明确说明。/);
  assert.doesNotMatch(page, /API Key 仅保存在本机服务器环境中|提出问题后，(?:答案|回答)与经过校验的来源会显示在这里/);
});
