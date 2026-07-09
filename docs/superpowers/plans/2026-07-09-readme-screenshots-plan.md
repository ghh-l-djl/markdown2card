# README Screenshots Addition Implementation Plan (Updated)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Preview section with 5 screenshots (including the new settings panel) and correct bilingual descriptions to README.md and README.zh-CN.md.

**Architecture:** Use standard relative Markdown image links with detailed descriptive captions formatted in italic text underneath each image. Insert this section immediately after the language selector header in both files.

**Tech Stack:** Markdown, Git.

## Global Constraints
- Do not modify existing, unrelated sections of the README files.
- Keep the relative paths to screenshots exactly matching the existing root-level filenames.
- Commit the changes after each file is updated.

---

### Task 1: Update English README.md

**Files:**
- Modify: `README.md` (lines 5-23)

**Interfaces:**
- Consumes: `./全览效果.png`, `./细节图.png`, `./操作面板.png`, `./支持mermaid和图片.png`, `./代码自动分页-支持latex.png`
- Produces: Updated `README.md` containing the updated "Preview" section.

- [ ] **Step 1: Replace the old Preview section in `README.md` with the new 5-image list**

```markdown
## Preview

![Card Flow Overview](./全览效果.png)
*Card Flow Overview: A multi-page grid preview of the generated cards, showing the full flow layout.*

![Card Details](./细节图.png)
*Card Details: A close-up view of a single card's rendering details, showcasing precise typography, margins, and background styles.*

![Settings Panel](./操作面板.png)
*Settings Panel: A feature-rich settings sidebar that allows switching themes, selecting custom background styles and fonts, adjusting footer visibility, and providing one-click copy or export actions.*

![Mermaid & Image Support](./支持mermaid和图片.png)
*Mermaid & Image Support: Easily scales and renders embedded images and Mermaid diagrams onto the cards, including automatic scaling and appending full-size exports for oversized diagrams.*

![Auto-Pagination & LaTeX](./代码自动分页-支持latex.png)
*Auto-Pagination, Code Blocks & LaTeX: Supports rendering and syntax highlighting for code blocks and LaTeX math formulas, with automatic physical pagination based on actual card height to prevent content clipping.*

---
```

- [ ] **Step 2: Commit `README.md`**

Run: `git commit -am "docs: update English README screenshots and descriptions"`

---

### Task 2: Update Chinese README.zh-CN.md

**Files:**
- Modify: `README.zh-CN.md` (lines 5-23)

**Interfaces:**
- Consumes: `./全览效果.png`, `./细节图.png`, `./操作面板.png`, `./支持mermaid和图片.png`, `./代码自动分页-支持latex.png`
- Produces: Updated `README.zh-CN.md` containing the updated "效果展示" section.

- [ ] **Step 1: Replace the old 效果展示 section in `README.zh-CN.md` with the new 5-image list**

```markdown
## 效果展示

![全览效果](./全览效果.png)
*全览效果：卡片生成后的多页网格预览效果，支持完整的卡片流展示。*

![细节图](./细节图.png)
*细节图：单张卡片的渲染细节，完美还原排版、边距与背景样式。*

![操作面板](./操作面板.png)
*操作面板：功能丰富的配置工具栏，支持切换主题、设置自定义背景与字体、调整页脚显隐，并提供快捷的一键复制或导出操作。*

![支持mermaid和图片](./支持mermaid和图片.png)
*支持 Mermaid 与图片：支持将 Markdown 中的图片与 Mermaid 图表完美缩放并渲染入卡片中，并提供超限 Mermaid 图表的原尺寸追加导出。*

![代码自动分页-支持latex](./代码自动分页-支持latex.png)
*代码块与 LaTeX 公式自动分页：支持数学公式 (LaTeX) 和代码块的高亮与渲染，并能够根据实际渲染卡片高度自动进行物理分页，确保长内容不被截断。*

---
```

- [ ] **Step 2: Commit `README.zh-CN.md`**

Run: `git commit -am "docs: update Chinese README screenshots and descriptions"`
