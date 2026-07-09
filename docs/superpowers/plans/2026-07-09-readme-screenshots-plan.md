# README Screenshots Addition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Preview section with screenshots and bilingual descriptions to README.md and README.zh-CN.md.

**Architecture:** Use standard relative Markdown image links with detailed descriptive captions formatted in italic text underneath each image. Insert this section immediately after the language selector header in both files.

**Tech Stack:** Markdown, Git.

## Global Constraints
- Do not modify existing, unrelated sections of the README files.
- Keep the relative paths to screenshots exactly matching the existing root-level filenames.
- Commit the changes after each file is updated.

---

### Task 1: Update English README.md

**Files:**
- Modify: `README.md` (insertion after line 3)

**Interfaces:**
- Consumes: `./全览效果.png`, `./细节图.png`, `./支持mermaid和图片.png`, `./代码自动分页-支持latex.png`
- Produces: Updated `README.md` containing the "Preview" section.

- [ ] **Step 1: Edit `README.md` to insert the Preview section**

Insert the following block right below `Language: English | [简体中文](./README.zh-CN.md)`:

```markdown
## Preview

![Overview](./全览效果.png)
*Overview: Live preview panel open inside Obsidian. Edit your Markdown on the left, and view the beautifully styled social cards in real-time on the right.*

![UI Details](./细节图.png)
*UI Details: Features a rich settings toolbar for theme switching, custom backgrounds, font options, footer visibility, and easy shortcuts to copy or export individual/all pages.*

![Mermaid & Image Support](./支持mermaid和图片.png)
*Mermaid & Image Support: Easily scales and renders embedded images and Mermaid diagrams onto the cards, including automatic scaling and appending full-size exports for oversized diagrams.*

![Auto-Pagination & LaTeX](./代码自动分页-支持latex.png)
*Auto-Pagination, Code Blocks & LaTeX: Supports rendering and syntax highlighting for code blocks and LaTeX math formulas, with automatic physical pagination based on actual card height to prevent content clipping.*

---
```

- [ ] **Step 2: Commit `README.md`**

Run: `git commit -am "docs: add screenshots to English README"`

---

### Task 2: Update Chinese README.zh-CN.md

**Files:**
- Modify: `README.zh-CN.md` (insertion after line 3)

**Interfaces:**
- Consumes: `./全览效果.png`, `./细节图.png`, `./支持mermaid和图片.png`, `./代码自动分页-支持latex.png`
- Produces: Updated `README.zh-CN.md` containing the "效果展示" section.

- [ ] **Step 1: Edit `README.zh-CN.md` to insert the 效果展示 section**

Insert the following block right below `语言：[English](./README.md) | 简体中文`:

```markdown
## 效果展示

![全览效果](./全览效果.png)
*全览效果：在 Obsidian 内部开启的实时预览面板，左侧编辑 Markdown，右侧实时呈现排版精致的社交卡片。*

![细节图](./细节图.png)
*细节图：提供丰富的参数设置与工具栏，包括主题切换、自定义背景、字体、页脚设置等，可快捷复制或导出单页/全部页面。*

![支持mermaid和图片](./支持mermaid和图片.png)
*支持 Mermaid 与图片：支持将 Markdown 中的图片与 Mermaid 图表完美缩放并渲染入卡片中，并提供超限 Mermaid 图表的原尺寸追加导出。*

![代码自动分页-支持latex](./代码自动分页-支持latex.png)
*代码块与 LaTeX 公式自动分页：支持数学公式 (LaTeX) 和代码块的高亮与渲染，并能够根据实际渲染卡片高度自动进行物理分页，确保长内容不被截断。*

---
```

- [ ] **Step 2: Commit `README.zh-CN.md`**

Run: `git commit -am "docs: add screenshots to Chinese README"`
