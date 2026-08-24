# Radar Readable Sage Theme Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task by task.

**Goal:** Replace the six opportunity radars' glaring neon green with a muted editorial sage palette and guarantee readable text on every dark evidence/company card, both in the live pages and in exported standalone HTML reports.

**Architecture:** Keep the current shared renderer and shared stylesheet. Define one semantic palette in `radar.css` for all six live radar pages, mirror the same tokens in the standalone-export CSS embedded in `radar.js`, and add contract tests that prevent either surface from drifting back to neon or dark-on-dark text.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node.js test runner, JSDOM.

---

## Task 1: Lock the readable-sage contract with failing tests

**Files:**
- Modify: `tests/radars/static-pages.test.mjs`
- Modify: `tests/radars/interaction.test.mjs`

### Step 1: Add the live-page palette contract

Extend `shared radar styles cover focus, mobile, reduced motion, and print` in `tests/radars/static-pages.test.mjs` with assertions for the semantic tokens and explicit dark-card text rules:

```js
assert.match(css, /--signal:\s*#a9b77a/);
assert.match(css, /--signal-strong:\s*#718052/);
assert.match(css, /--text-on-dark:\s*#edf2ee/);
assert.match(css, /--text-muted-dark:\s*#c1ccc5/);
assert.doesNotMatch(css, /#c9ff47/i);
assert.match(css, /\.decision-link strong\s*\{[^}]*color:\s*var\(--text-on-dark\)/s);
assert.match(css, /\.company-case-summary\s*\{[^}]*color:\s*var\(--text-muted-dark\)/s);
```

This verifies the shared live stylesheet used by legal, HR, retail, supply-chain, finance, and marketing.

### Step 2: Add the standalone-export palette contract

Extend `standalone export contains the complete current-domain report and no secrets` in `tests/radars/interaction.test.mjs`:

```js
assert.match(report, /--signal:#a9b77a/);
assert.match(report, /--signal-strong:#718052/);
assert.match(report, /--text-on-dark:#edf2ee/);
assert.match(report, /--text-muted-dark:#c1ccc5/);
assert.doesNotMatch(report, /#c9ff47/i);
assert.match(report, /\.evidence\{[^}]*color:var\(--text-on-dark\)/s);
assert.match(report, /\.evidence span\{[^}]*color:var\(--text-on-dark\)/s);
assert.match(report, /\.evidence small\{[^}]*color:var\(--text-muted-dark\)/s);
```

### Step 3: Run the focused tests and confirm RED

Run:

```bash
node --test tests/radars/static-pages.test.mjs tests/radars/interaction.test.mjs
```

Expected: failures show the current `#c9ff47` palette and the missing explicit dark-card text colors.

### Step 4: Commit the failing tests

```bash
git add tests/radars/static-pages.test.mjs tests/radars/interaction.test.mjs
git commit -m "test: define readable radar palette"
```

## Task 2: Apply the muted sage palette to the live radar pages

**Files:**
- Modify: `web/radars/radar.css`
- Test: `tests/radars/static-pages.test.mjs`

### Step 1: Add semantic theme tokens

Replace the current signal token and add explicit dark-surface colors near the top of `radar.css`:

```css
--signal: #a9b77a;
--signal-strong: #718052;
--text-on-dark: #edf2ee;
--text-muted-dark: #c1ccc5;
```

Keep `#f2a65a` for risk warnings and red lines so risk semantics remain distinct.

### Step 2: Fix contrast in evidence and company cards

Make inherited colors explicit on dark cards:

```css
.decision-link strong { color: var(--text-on-dark); }
.decision-link small { color: var(--text-muted-dark); }
.company-case-summary { color: var(--text-muted-dark); }
.source-fact p { color: var(--text-muted-dark); }
```

Keep metadata, section labels, borders, selected states, and score bars on `var(--signal)`. Use `var(--signal-strong)` only when sage appears as text or a progress fill on a light surface and needs stronger contrast.

### Step 3: Replace the neon-tinted evidence background

Change:

```css
background: rgba(201,255,71,.07);
```

to:

```css
background: rgba(169,183,122,.10);
```

### Step 4: Preserve print readability

Extend the existing `@media print` rules so the explicit dark-surface colors do not become pale text on white paper:

```css
.detail-block p,
.detail-list,
.decision-link strong,
.decision-link small,
.company-case-summary,
.source-fact p,
.calibration-item p { color: #222 !important; }
```

### Step 5: Run the live-style contract

Run:

```bash
node --test tests/radars/static-pages.test.mjs
```

Expected: PASS.

## Task 3: Apply the same palette to standalone HTML exports

**Files:**
- Modify: `web/radars/radar.js`
- Test: `tests/radars/interaction.test.mjs`

### Step 1: Mirror the semantic tokens in the embedded export CSS

In `buildStandaloneReport`, replace the root export variables with:

```css
--signal:#a9b77a;
--signal-strong:#718052;
--text-on-dark:#edf2ee;
--text-muted-dark:#c1ccc5;
```

### Step 2: Strengthen scores on light scenario sections

The matrix inspector has a dark surface and can keep `var(--signal)`. The expanded scenario scorecard sits on the paper background, so add scoped rules:

```css
.export-scenario details>.export-score header strong{color:var(--signal-strong)}
.export-scenario details>.export-score .score-row em{background:var(--signal-strong)}
```

This removes the glaring lime while keeping progress bars and the large total legible.

### Step 3: Fix evidence and company-card text explicitly

Both evidence anchors and company-case anchors use the `.evidence` class in exported reports. Add:

```css
.evidence{color:var(--text-on-dark)}
.evidence span{color:var(--text-on-dark)}
.evidence small{color:var(--text-muted-dark)}
```

Keep `.evidence b` on `var(--signal)` to preserve hierarchy without dominating the card.

### Step 4: Preserve print readability in exported reports

Inside the export's `@media print`, add:

```css
.evidence,.evidence span,.evidence small{color:#111}
```

### Step 5: Run the export contract

Run:

```bash
node --test tests/radars/interaction.test.mjs
```

Expected: PASS.

### Step 6: Commit the implementation

```bash
git add web/radars/radar.css web/radars/radar.js
git commit -m "feat: soften radar colors and restore contrast"
```

## Task 4: Verify all six domains and deploy the shared fix

**Files:**
- Verify: `web/radars/legal.html`
- Verify: `web/radars/hr.html`
- Verify: `web/radars/retail.html`
- Verify: `web/radars/supply-chain.html`
- Verify: `web/radars/finance.html`
- Verify: `web/radars/marketing.html`
- Deploy: `/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/radars/radar.css`
- Deploy: `/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/radars/radar.js`

### Step 1: Run the complete automated suite

Run:

```bash
npm test
```

Expected: all tests PASS.

### Step 2: Sync only the shared radar assets to the desktop copy

Run:

```bash
rsync -a web/radars/radar.css web/radars/radar.js "/Users/rita/Desktop/AI行业报告/AI行业报告知识库/web/radars/"
```

Because all six domains share these two files, one sync updates every radar without duplicating changes in domain data.

### Step 3: Visually inspect a live radar

Open `http://127.0.0.1:4318/radars/hr.html`, expand one scenario, and verify:

- score bars and totals are muted sage rather than fluorescent lime;
- evidence titles, company names, summaries, and limitations are readable on dark green;
- risk warnings remain orange;
- focus, hover, selected matrix points, and mobile layout remain clear.

### Step 4: Visually inspect an exported radar

Export the complete HR report, open the generated HTML, and inspect the same scenario. Confirm that the light-background scorecard uses `#718052` and every dark evidence/company card uses light text. Repeat a quick export check for one 24-scenario domain such as retail to ensure the extended report uses the same theme.

### Step 5: Check the worktree

Run:

```bash
git status --short
```

Expected: only the pre-existing untracked `.superpowers/` directory remains; no theme files or tests are uncommitted.
