# Spec: README Screenshot Additions (Updated)

**Date:** 2026-07-09  
**Status:** Approved  

## Purpose
Enhance user discovery and documentation visual appeal by adding screenshots demonstrating key capabilities (card flow overview, card rendering details, settings panel, Mermaid support, auto-pagination with LaTeX) of the Obsidian plugin directly in both the English (`README.md`) and Chinese (`README.zh-CN.md`) documentation files.

## Files to Modify
1. [README.md](file:///Users/ghh/Documents/编程/项目/obsidian-to-card/README.md)
2. [README.zh-CN.md](file:///Users/ghh/Documents/编程/项目/obsidian-to-card/README.zh-CN.md)

## Design Details
Add a sequential vertical list of images with accompanying descriptions right below the language navigation headers.

### Image Files Used (Root of the repo)
- `./全览效果.png`
- `./细节图.png`
- `./操作面板.png`
- `./支持mermaid和图片.png`
- `./代码自动分页-支持latex.png`

### English README Insertion (`README.md`)
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

### Chinese README Insertion (`README.zh-CN.md`)
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
