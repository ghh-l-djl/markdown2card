# Spec: README Screenshot Additions

**Date:** 2026-07-09  
**Status:** Approved  

## Purpose
Enhance user discovery and documentation visual appeal by adding screenshots demonstrating key capabilities (live preview, details menu, Mermaid support, auto-pagination with LaTeX) of the Obsidian plugin directly in both the English (`README.md`) and Chinese (`README.zh-CN.md`) documentation files.

## Files to Modify
1. [README.md](file:///Users/ghh/Documents/编程/项目/obsidian-to-card/README.md)
2. [README.zh-CN.md](file:///Users/ghh/Documents/编程/项目/obsidian-to-card/README.zh-CN.md)

## Design Details
Add a sequential vertical list of images with accompanying descriptions right below the language navigation headers.

### Image Files Used (Root of the repo)
- `./全览效果.png`
- `./细节图.png`
- `./支持mermaid和图片.png`
- `./代码自动分页-支持latex.png`

### English README Insertion (`README.md`)
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

### Chinese README Insertion (`README.zh-CN.md`)
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
