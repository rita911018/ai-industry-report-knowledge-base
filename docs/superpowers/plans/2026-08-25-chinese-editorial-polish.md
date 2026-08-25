# 469 篇中文全文编辑校订实施计划

> **执行要求：** 使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 逐任务执行；每完成一个复选项就更新状态。正文改写只能由 Codex 完成，不调用外部翻译模型。

**目标：** 对知识库 469 篇 `中文全文.md` 做逐篇中文编辑校订，消除硬译和网页噪音，在不删减文章信息的前提下形成自然、专业、连贯的中文全文，并重建可阅读 HTML 与知识库索引。

**架构：** 英文原文保持只读，中文 Markdown 是唯一正文源，HTML 与检索语料均由现有生成器派生。新增版本化中文风格指南、确定性质量扫描器、可恢复账本和隔离式 Codex 校订/复核流水线。每篇只有在结构校验、事实完整性校验和独立复核都通过后才原子写回；失败保留旧译文并标记 `needs_review`。

**技术栈：** Node.js ESM、Node test runner、Markdown/HTML、JSON 状态账本、现有 `verifyTranslation`、现有 reader/corpus 生成器、`codex exec`。

---

## 文件地图

- `docs/editorial/chinese-style-guide.md`：中文行文规范、术语表、专名与噪音规则。
- `src/editorial/chinese-quality.mjs`：噪音识别、清洁基线、结构与行文风险校验。
- `src/editorial/polish-ledger.mjs`：469 篇状态账本的创建、恢复和哈希失效逻辑。
- `src/editorial/codex-polish-runner.mjs`：隔离任务目录、整篇/分章校订、独立复核、原子写回。
- `src/editorial/run-polish.mjs`：按来源和索引范围执行，遇阻停止并保存状态。
- `tests/editorial/*.test.mjs`：风格、质量、账本、runner 与命令行合同。
- `work/editorial/chinese-polish-ledger.json`：逐篇可恢复状态。
- `work/editorial/chinese-quality-audit.json`：自动校验、抽样与来源验收记录。
- `work/archive/**/英文原文.md`：只读事实基准。
- `work/archive/**/中文全文.md`：唯一可编辑中文正文。
- `work/archive/**/中文全文.html`：通过现有 reader 命令重建。
- `work/knowledge/corpus.json`、`web/data/articles.js`：通过现有 corpus 命令重建。

## 全程不变量

- 不改文章 ID、来源、标题身份、评分、分类、来源 URL 和 `archiveIndex`。
- 不摘要、不删正文论点，不改变数字、日期、币种、单位、公司名、产品名和模型名。
- 仅允许删除明确分类的整块网页功能噪音；不得全库盲目替换同名正文词语。
- 校订前后的非噪音 Markdown 标题、列表、表格、链接、图片与脚注必须可对应。
- 任何失败都不得覆盖原 `中文全文.md`；所有产物可从账本恢复。
- 首页导航与 51 篇概要计划保持暂停，直至本计划完成最终重建。

---

### Task 1：固化中文编辑规范

**文件：**
- 新增：`docs/editorial/chinese-style-guide.md`
- 新增：`tests/editorial/style-guide.test.mjs`

- [ ] **Step 1：先写失败的规范合同测试**

测试读取风格指南并要求以下章节均存在：忠实性、中文语序、术语表、专名、数字与单位、标点与空格、引语、网页噪音、禁止事项、来源差异。另要求术语表至少覆盖 `agent/agentic`、`generative AI`、`foundation model`、`operating model`、`workflow`、`use case`、`governance`、`resilience`、`upskilling/reskilling`。

运行：

```bash
node --test tests/editorial/style-guide.test.mjs
```

预期：文件尚不存在，测试失败。

- [ ] **Step 2：编写风格指南 v1**

明确：完整忠实优先于文采；允许同段拆句但不跨段搬移论点；品牌专名不强译；首次出现的歧义术语使用“中文（English）”；统一中文全角标点和中英文间空格；不同来源只保留必要的署名与图表语气差异，不保留英文句法。

将可删除噪音限定为整段/整行规则并赋予代码：`save_share_print`、`subscribe_newsletter`、`cookie_language`、`progress_widget`、`duplicate_navigation`。正文中含这些单词的完整句子不得按关键词删除。

- [ ] **Step 3：运行测试并提交**

```bash
node --test tests/editorial/style-guide.test.mjs
git add docs/editorial/chinese-style-guide.md tests/editorial/style-guide.test.mjs
git commit -m "docs: define Chinese editorial style guide"
```

---

### Task 2：建立确定性中文质量校验器

**文件：**
- 新增：`src/editorial/chinese-quality.mjs`
- 新增：`tests/editorial/chinese-quality.test.mjs`
- 复用：`src/translation/verify-translation.mjs`

- [ ] **Step 1：写噪音边界和完整性失败测试**

测试至少覆盖：

1. 独立的 `Save It For Later`、`Share`、`Print`、`Subscribe`、`Progress:`、`en` 被识别为噪音。
2. “企业需要分享经验”或带 `print` 的代码/来源链接不被删除。
3. 删除噪音后的基线可继续保留所有非噪音 URL、数字、标题、列表和表格。
4. 校订稿丢数字、链接、标题、列表项、表格列或图片时失败。
5. 出现禁用译法、孤立英文界面词、英文标点混用、重复标点或异常长度变化时生成明确风险。

运行：

```bash
node --test tests/editorial/chinese-quality.test.mjs
```

预期：模块不存在，测试失败。

- [ ] **Step 2：实现纯函数接口**

导出：

```js
classifyNoiseBlock(block)
cleanBaseline(markdown)
scanChineseStyle(markdown, glossary)
verifyPolishedChinese({ original, before, polished, glossary })
```

实现约束：

- `classifyNoiseBlock` 只对完整块分类，不执行子字符串替换。
- `cleanBaseline` 返回 `{ markdown, removals }`，记录每个噪音代码、原始块哈希和数量。
- `verifyPolishedChinese` 先以英文原文和校订稿调用现有 `verifyTranslation`，再以清洁后的旧中文为结构对照；错误对象包含文章定位和具体缺失项。
- 长度阈值作为风险而非唯一判定；正文短于清洁基线 80% 或长于 140% 时必须进入复核。
- 扫描器只报告疑似硬译，不自行改写文章。

- [ ] **Step 3：验证并提交**

```bash
node --test tests/editorial/chinese-quality.test.mjs tests/translation-verifier.test.mjs
git add src/editorial/chinese-quality.mjs tests/editorial/chinese-quality.test.mjs
git commit -m "feat: verify Chinese editorial quality"
```

---

### Task 3：建立可恢复状态账本

**文件：**
- 新增：`src/editorial/polish-ledger.mjs`
- 新增：`tests/editorial/polish-ledger.test.mjs`
- 生成：`work/editorial/chinese-polish-ledger.json`

- [ ] **Step 1：写账本状态机失败测试**

要求状态仅为 `pending`、`in_progress`、`verified`、`needs_review`；条目包含文章 ID、publisher、archiveIndex、目录、英文哈希、校订前/后中文哈希、批次、噪音计数、校验结果、复核结果、时间戳。测试以下恢复逻辑：

- 首次扫描严格得到 469 个唯一条目并按来源顺序和 `archiveIndex` 排序。
- `verified` 且两个输入哈希未变时跳过。
- 英文或中文源哈希变化时自动回到 `needs_review`。
- 上次异常留下的 `in_progress` 再启动时回到 `needs_review`。
- 状态转换后写临时文件再原子替换，非法状态或重复 ID 拒绝写入。

- [ ] **Step 2：实现账本 API 与 CLI 初始化**

导出 `scanArchiveEntries`、`reconcileLedger`、`transitionEntry`、`writeLedgerAtomic`。CLI 支持：

```bash
node src/editorial/polish-ledger.mjs \
  --ledger work/normalized/articles.json \
  --archive work/archive \
  --out work/editorial/chinese-polish-ledger.json \
  --expected 469
```

- [ ] **Step 3：运行测试、生成基线并提交代码**

```bash
node --test tests/editorial/polish-ledger.test.mjs
node src/editorial/polish-ledger.mjs --ledger work/normalized/articles.json --archive work/archive --out work/editorial/chinese-polish-ledger.json --expected 469
git add src/editorial/polish-ledger.mjs tests/editorial/polish-ledger.test.mjs
git commit -m "feat: add resumable Chinese polish ledger"
```

账本属于运行产物；先检查体积和仓库既有约定，再决定是否提交，不能未经检查把临时日志加入 Git。

---

### Task 4：实现隔离式 Codex 校订与独立复核

**文件：**
- 新增：`src/editorial/codex-polish-runner.mjs`
- 新增：`src/editorial/run-polish.mjs`
- 新增：`tests/editorial/codex-polish-runner.test.mjs`
- 新增：`tests/editorial/run-polish.test.mjs`

- [ ] **Step 1：用假执行器写 RED 测试**

测试不真实调用 Codex，注入 fake executor 验证：

- 任务临时目录只包含 `source.md`、`current.md`、`style-guide.md` 和必要的章节上下文。
- 编辑任务只产出完整 `polished.md`，复核任务是独立调用并产出结构化 `review.json`。
- 自动校验或复核失败时原中文文件字节不变，账本为 `needs_review`。
- 全部通过时使用同目录临时文件和原子 rename 写回，账本为 `verified`。
- 超过 40,000 字符按一级/二级 Markdown 标题切分，合并后标题顺序和章节数不变。
- `--publisher`、`--min-index`、`--max-index`、`--limit`、`--resume`、`--dry-run` 的筛选和排序稳定。
- 日志不得包含环境变量、API key 或文章全文。

- [ ] **Step 2：实现 runner 与 prompt 合同**

默认执行命令：

```bash
codex exec --ephemeral --ignore-user-config \
  -m gpt-5.4-mini \
  -c 'model_reasoning_effort="medium"' \
  -C <isolated-job-directory> \
  --sandbox workspace-write \
  '<editor-or-review-prompt>'
```

编辑 prompt 明确：只改写中文行文；不得摘要、解释或增补事实；必须输出完整 Markdown。复核 prompt 对照英文、旧中文清洁基线、校订稿和风格指南，输出 `{ approved, blockers, warnings, terminology }`。复核不能复用编辑调用的上下文。

长文按标题边界分章；每章携带标题、全局术语表、专名表和已确认术语状态。合并后必须整篇再次执行 `verifyPolishedChinese`，不得按“每章通过”直接写回。

- [ ] **Step 3：实现编排器的停止与恢复语义**

`run-polish.mjs` 每次状态转换都保存账本；遇到第一个 `needs_review` 默认停止，除非显式 `--continue-on-review`。`--dry-run` 只显示将处理的文章，不创建 Codex 任务、不写正文。

- [ ] **Step 4：验证并提交**

```bash
node --test tests/editorial/codex-polish-runner.test.mjs tests/editorial/run-polish.test.mjs
git add src/editorial/codex-polish-runner.mjs src/editorial/run-polish.mjs tests/editorial/codex-polish-runner.test.mjs tests/editorial/run-polish.test.mjs
git commit -m "feat: add isolated Codex editorial pipeline"
```

---

### Task 5：麦肯锡 5 篇试点与规则校准

**文件：**
- 修改：5 篇 McKinsey `work/archive/**/中文全文.md`
- 修改：`docs/editorial/chinese-style-guide.md`（仅在发现普遍术语问题时）
- 更新：`work/editorial/*.json`

- [ ] **Step 1：确认试点样本和只读基线**

选择 McKinsey `archiveIndex` 1、3、7、31、49，覆盖普通篇、长篇、数字/表格、引语和不同主题。保存英文与中文哈希，运行 `--dry-run` 确认只命中 5 篇。

- [ ] **Step 2：逐篇校订、自动校验、独立复核**

```bash
node src/editorial/run-polish.mjs --publisher McKinsey --indexes 1,3,7,31,49 --resume
```

每篇完成后检查 diff：事实、数字、链接、标题结构完整；噪音删除均有分类；中文读起来不是英文逐句映射。任何阻断问题先修规则或单篇重做，不进入全量批次。

- [ ] **Step 3：重建 5 篇 HTML 并做浏览器抽查**

运行现有 reader 生成器；浏览器检查标题、概要、正文、列表、表格、链接、脚注和移动端阅读。记录试点审阅结论到质量审计。

- [ ] **Step 4：提交试点**

```bash
git add docs/editorial work/archive work/editorial
git commit -m "edit: polish McKinsey Chinese pilot articles"
```

试点提交前只添加本任务相关文件，禁止用宽泛 `git add .`。

---

### Task 6：完成 McKinsey 49 篇

- [ ] 按 `archiveIndex` 升序处理剩余 44 篇，默认遇阻停止并修复后恢复。
- [ ] 49/49 自动校验通过，账本全部 `verified`。
- [ ] 抽查至少 5 篇，强制包含最长文章、数字/表格最多文章、引语文章、最高分文章和随机样本；记录样本 ID 与结论。
- [ ] 重建 McKinsey 中文 HTML，运行 reader 校验与浏览器抽查。
- [ ] 仅提交该来源正文、审计和必要规则变更：`edit: polish McKinsey Chinese library`。

---

### Task 7：完成 Anthropic 32 篇

- [ ] 先运行 `--dry-run --publisher Anthropic`，确认 32 篇且排序正确。
- [ ] 逐篇校订；重点检查模型名、能力术语、研究方法与引语语气。
- [ ] 32/32 自动校验和独立复核通过。
- [ ] 抽查至少 4 篇，并覆盖最长、数据密集、引语、随机样本。
- [ ] 重建 HTML、验证浏览器阅读并提交：`edit: polish Anthropic Chinese library`。

---

### Task 8：完成 BCG 132 篇

- [ ] 分为 1–33、34–66、67–99、100–132 四个可恢复范围执行。
- [ ] 每个范围结束后检查状态计数、结构异常、噪音计数和术语漂移；不把失败带入下一范围。
- [ ] 132/132 自动校验和独立复核通过。
- [ ] 抽查至少 14 篇，覆盖最长、图表/数字密集、引语、不同主题和随机样本。
- [ ] 重建 HTML、验证浏览器阅读并提交：`edit: polish BCG Chinese library`。

---

### Task 9：完成 MIT 43 篇

- [ ] 先运行 `--dry-run --publisher MIT`，确认 43 篇。
- [ ] 逐篇校订；重点处理学术术语、研究结论限定语、作者引语和图表说明。
- [ ] 43/43 自动校验和独立复核通过。
- [ ] 抽查至少 5 篇，覆盖最长、数据密集、引语、学术研究和随机样本。
- [ ] 重建 HTML、验证浏览器阅读并提交：`edit: polish MIT Chinese library`。

---

### Task 10：完成 Bain 213 篇

- [ ] 分为 1–36、37–72、73–108、109–144、145–180、181–213 六个可恢复范围执行。
- [ ] 每个范围独立验收状态计数、结构异常、噪音删除和术语一致性。
- [ ] 213/213 自动校验和独立复核通过。
- [ ] 抽查至少 22 篇，覆盖最长、数据/表格、引语、不同业务主题和随机样本。
- [ ] 重建 HTML、验证浏览器阅读并提交：`edit: polish Bain Chinese library`。

---

### Task 11：全库重建、最终验收与桌面部署

**文件：**
- 重建：`work/archive/**/中文全文.html`
- 重建：`work/knowledge/corpus.json`
- 重建：`web/data/articles.js`
- 更新：`work/editorial/chinese-quality-audit.json`

- [ ] **Step 1：验证 469 篇账本与全文完整性**

运行账本核对、现有翻译校验和新增中文质量校验，要求：469 个唯一 ID、469/469 `verified`、五个来源数量精确、零 `in_progress`、零 `needs_review`、全部输入/输出哈希匹配。

- [ ] **Step 2：重建所有派生产物**

```bash
npm run readers
npm run verify:readers
npm run corpus
```

确认 HTML 只由 Markdown 生成；corpus 与浏览器索引均为 469 篇且引用最新中文正文。

- [ ] **Step 3：运行全套测试和静态检查**

```bash
npm test
git diff --check
```

预期：全部测试通过，只有明确允许的运行产物或既存未跟踪目录。

- [ ] **Step 4：浏览器最终抽查**

每个来源至少打开 2 篇，共不少于 10 篇；必须覆盖桌面与移动端、长文、表格、引语、脚注和全文问答引用。检查：中文自然、无网页功能噪音、标题/列表/表格完整、原文链接可用、问答文章来源指向正确。

- [ ] **Step 5：同步到桌面交付目录并比对**

只同步已验证的 archive、corpus 和浏览器索引到 `/Users/rita/Desktop/AI行业报告/AI行业报告知识库`。用 `cmp` 或 SHA-256 逐类比对工作树与桌面部署，重启 4318 服务后确认首页、文章详情、全文页和全局问答均可访问。

- [ ] **Step 6：提交最终审计与交付说明**

```bash
git add work/editorial work/knowledge web/data/articles.js
git commit -m "chore: rebuild polished Chinese knowledge library"
```

提交前逐项审查 `git status --short`，不要纳入 `.superpowers/`、临时 Codex 任务目录、日志或密钥。

## 完成定义

- 469/469 中文全文经 Codex 校订和独立复核，状态均为 `verified`。
- 五个来源均完成至少 10% 抽查并留下可追踪记录。
- 英文事实、数字、链接和 Markdown 结构无缺失；网页噪音删除有明确分类。
- 所有中文 HTML、知识库 corpus 和浏览器索引从最新 Markdown 成功重建。
- 全套测试通过，桌面部署与工作版本逐字节一致，浏览器阅读和问答引用验收通过。
