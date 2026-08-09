# AI行业报告知识库 · Design System

## Visual thesis

克制的编辑部研究台：暖白纸张、墨黑文字、矿物蓝绿强调色，以纵向索引线和来源编号构成可辨识的“雷达刻度”。

## Content plan

1. 顶部：产品名、归档规模、API 状态。
2. 核心：可追问的问题输入区和带逐条来源的答案。
3. 资料：筛选条、文章索引、全文与原始来源入口。
4. 底部：检索和引用方法说明。

## Interaction thesis

- 首屏元素以 180–260ms 的轻微上移淡入建立层级。
- 文章行悬停时来源刻度向右推进，强调可打开性。
- 来源抽屉从右侧进入；在减少动态效果偏好下关闭所有位移动画。

## Tokens

- Canvas: `#f4f2ec`
- Paper: `#fbfaf6`
- Ink: `#17211d`
- Muted: `#66706b`
- Accent: `#126e68`
- Signal: `#c85d3a`
- Typeface: system Chinese sans for UI; Georgia/Noto Serif SC for editorial headings.
- Layout: 12-column desktop, one-column mobile, 72rem reading maximum.
- Signature: 1px vertical radar scale with indexed source marks.

## Accessibility

- Normal text contrast ≥ 4.5:1; all controls have visible labels and focus rings.
- Interactive targets are at least 44px tall.
- Dialog and drawer support Escape; focus is returned to the trigger.
- Live answer updates use `aria-live="polite"`.
- All motion is disabled for `prefers-reduced-motion: reduce`.

## Anti-patterns

- No generic dashboard card mosaic.
- No decorative gradients or excessive pills.
- No source-brand imitation.
- No API key in browser storage, HTML, or JavaScript.
