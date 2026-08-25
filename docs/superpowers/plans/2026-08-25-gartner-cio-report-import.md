# Gartner 2H26 CIO Report Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Gartner 22 页《2H26 The CIO Report》完整归档进 AI 行业报告知识库，并同步为可在 Obsidian 中阅读和打开原 PDF 的中文研究笔记。

**Architecture:** 把整份报告作为一条 Gartner 报告记录，而不是拆成四篇。英文 Markdown、中文 Markdown 和原 PDF 是权威归档源；中文 HTML、检索 corpus、浏览器索引和 Obsidian 笔记均由这些源文件派生。重复页眉页脚视为版面噪音，正文、统计数字、四个问题、行动计划、角色表和资源说明完整保留。

**Tech Stack:** Node.js ESM、Markdown/HTML、JSON、现有 reader/corpus 生成器、PDF 文本与页面核验、Obsidian Markdown。

---

### Task 1：建立 Gartner 报告归档与中文全文

**Files:**
- Create: `work/archive/Gartner CIO Report · 2H26/articles/001-the-cio-report/metadata.json`
- Create: `work/archive/Gartner CIO Report · 2H26/articles/001-the-cio-report/英文原文.md`
- Create: `work/archive/Gartner CIO Report · 2H26/articles/001-the-cio-report/中文全文.md`
- Create: `work/archive/Gartner CIO Report · 2H26/articles/001-the-cio-report/原始网页.html`
- Copy: `/Users/rita/Downloads/cio-report-h2-2026.pdf` to `work/archive/Gartner CIO Report · 2H26/articles/001-the-cio-report/原始报告.pdf`
- Test: `tests/gartner-cio-import.test.mjs`

- [ ] **Step 1:** 先写失败测试，要求五个文件存在，PDF SHA-256 与下载源一致，metadata ID 为 `gartner-cio-report-h2-2026`，发布方为 Gartner，发布日期为 `2026-08-15`，英文与中文全文包含四个 CIO 问题及所有关键数字 `50%`、`73%`、`85%`、`24%`、`70%`、`30%`、`90%`、`20%`、`48%`、`51%`、`56%`、`40%`。
- [ ] **Step 2:** 运行 `node --test tests/gartner-cio-import.test.mjs`，确认因归档不存在而 RED。
- [ ] **Step 3:** 根据 PDF 全文和页面视觉核验编写英文 Markdown；删除重复的 `Gartner for CIOs / Follow Us on LinkedIn / Become a Client` 页脚，但保留报告正文、引语、统计、四组 Gartner Answer、四组 Sample Action Plan、四组 Essential Leadership Roles、About Gartner 与资源页。
- [ ] **Step 4:** 由 Codex 完整翻译为自然中文，保持标题、段落、列表和表格结构，不摘要、不省略数字或限定条件；使用“企业架构（EA）”“IT 运营模式”“遗留系统”“人机协作团队”等统一术语。
- [ ] **Step 5:** 创建安全的 `原始网页.html` 本地说明页，提供 `原始报告.pdf` 链接和 Gartner 官方 CIO 页面链接，不嵌入脚本。
- [ ] **Step 6:** 运行导入测试与 `verifyTranslation`，确认 GREEN；提交 `feat: archive Gartner 2H26 CIO report`。

### Task 2：加入 470 篇知识库并重建阅读产物

**Files:**
- Modify: `work/normalized/articles.json`
- Modify: `package.json`
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/chat-widget.js`
- Modify: `tests/web/chat-widget.test.mjs`
- Generate: `work/archive/Gartner CIO Report · 2H26/articles/001-the-cio-report/中文全文.html`
- Generate: `work/knowledge/corpus.json`
- Generate: `web/data/articles.js`

- [ ] **Step 1:** 扩展失败测试，要求 canonical ledger 恰好 470 条且 Gartner ID 唯一；记录包含官方 URL、中文标题“Gartner 2026 下半年 CIO 报告”、`Report` 类型、100 分制评分、四条可定位证据和 PDF provenance。
- [ ] **Step 2:** 把 Gartner 记录追加到 canonical ledger，`priority=must-read`，分类为“技术、数据与架构”，次级分类覆盖“AI 战略与价值”“组织、人才与工作”“治理、风险与安全”。
- [ ] **Step 3:** 将所有运行时文章总数文案和 reader 命令的期望数从 469 改为 470；测试同步更新，不改历史规格文档。
- [ ] **Step 4:** 运行 `npm run readers && npm run verify:readers && npm run corpus`，要求 470 篇、Gartner 中文 HTML 可验证、corpus 含 Gartner chunks、浏览器索引含唯一 Gartner 条目。
- [ ] **Step 5:** 运行相关测试后提交 `feat: add Gartner report to knowledge library`。

### Task 3：生成并同步 Obsidian 研究笔记

**Files:**
- Create: `work/obsidian/2026-Gartner-CIO报告/Gartner 2026 下半年 CIO 报告-中文全文.md`
- Create: `work/obsidian/2026-Gartner-CIO报告/附件/Gartner-2H26-CIO-Report.pdf`
- Modify after backup: `/Users/rita/瑞塔的知识库/02 - Areas 按领域分类的资源/AI行业观察/索引.md`
- Deploy to: `/Users/rita/瑞塔的知识库/02 - Areas 按领域分类的资源/AI行业观察/2026-Gartner-CIO报告/`

- [ ] **Step 1:** 生成 Obsidian 笔记，YAML 包含 publisher、title_original、published、priority、score、topics、source_url、local_archive、imported；正文包含核心导读、四个 CIO 问题、关键数据、完整中文全文、官方来源和 `![[附件/Gartner-2H26-CIO-Report.pdf]]`。
- [ ] **Step 2:** 检查笔记中的内部 PDF 链接、标题和全文非空，且不存在重复页脚噪音。
- [ ] **Step 3:** 备份当前 `索引.md`，只在“专题资料库（自治子库）”加入一个幂等入口：`[[2026-Gartner-CIO报告/Gartner 2026 下半年 CIO 报告-中文全文|Gartner 2026 下半年 CIO 报告]]`。
- [ ] **Step 4:** 用 `rsync -a` 把 staging 目录同步到 vault；再次执行时覆盖同名文件而不产生副本。用 `cmp` 验证 PDF 和 Markdown 与 staging 一致。
- [ ] **Step 5:** 提交仓库中的 Obsidian staging 文件与导入测试，提交信息 `docs: stage Gartner CIO report for Obsidian`。

### Task 4：桌面部署与最终验收

**Files:**
- Deploy archive and generated knowledge files to: `/Users/rita/Desktop/AI行业报告/AI行业报告知识库/`

- [ ] **Step 1:** 运行 `npm test` 和 `git diff --check`，要求全绿且无意外未提交文件。
- [ ] **Step 2:** 同步新增 Gartner archive、`work/normalized/articles.json`、`work/knowledge/corpus.json`、`web/data/articles.js` 及总数文案相关 web 文件到桌面知识库。
- [ ] **Step 3:** 重启 4318 桌面服务；`/api/health` 报告 470 篇，首页显示 470，搜索“CIO 企业架构”可命中 Gartner 报告。
- [ ] **Step 4:** 浏览器打开 Gartner 中文阅读页，检查标题、概要、四个章节、表格、官方链接和原始报告入口；检查 Obsidian 笔记与内嵌 PDF 可打开。
- [ ] **Step 5:** 用 `cmp` 或 SHA-256 核对工作树、桌面知识库和 Obsidian PDF，记录最终路径与验证结果。
