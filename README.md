# AI 行业报告知识库

本项目归档五份洞察雷达及 2026 年 7–8 月增量更新中的 469 篇官方文章，保存原始网页、英文原文、完整中文翻译与结构化元数据，并提供本地全文检索及带来源校验的 DeepSeek V4 问答。每篇中文全文同时生成排版友好的 `中文全文.html`；`中文全文.md` 保留为 AI 检索与审计的内容源。

## 本地使用

```bash
npm run corpus
DEEPSEEK_API_KEY="你的密钥" npm start
```

浏览器打开 <http://127.0.0.1:4318>。不配置 API Key 时，文章浏览与本地检索仍然可用，只有生成式问答不可用。密钥只由本机 Node 服务读取，不会进入浏览器代码或归档文件。

机会雷达入口：

- 雷达目录：<http://127.0.0.1:4318/radars/>
- 企业法务：<http://127.0.0.1:4318/radars/legal.html>
- 人力资源：<http://127.0.0.1:4318/radars/hr.html>

两个雷达均为离线静态决策工具，不需要 API Key。它们不会采集员工或法务数据，也不会代替具名专业人员作法律承诺、录用、晋升、调薪、纪律或解雇决定。

可通过 `DEEPSEEK_MODEL=deepseek-v4-pro` 改用 Pro；默认使用 `deepseek-v4-flash`。

## 数据目录

- `work/archive/`：逐篇归档与翻译。
- `work/normalized/articles.json`：五份雷达合并后的结构化记录。
- `work/knowledge/corpus.json`：供本地服务检索的全文片段。
- `web/data/articles.js`：浏览器使用的轻量文章索引。

## 验证

```bash
npm test
npm run verify:readers
node src/audit/archive-audit.mjs --root work/archive --expected 469 --verify-readers
node src/translation/verify-translation.mjs --all work/archive
node src/knowledge/build-corpus.mjs --verify work/knowledge/corpus.json
```
