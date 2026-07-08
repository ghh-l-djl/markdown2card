# markdown2card 功能与实现分析

## 仓库形态

原仓库是 Obsidian 插件发布包，只包含 `manifest.json`、`main.js`、`styles.css`、图片和文档。
`main.js` 是 esbuild bundle，但保留了原始模块注释，因此可以反向拆出主要源码边界。

## 功能边界

- 注册 Obsidian 自定义视图 `note-to-red`，显示名为 `markdown2card`。
- 读取当前 Markdown 文件，将渲染后的 Markdown DOM 重组为固定比例图文卡片。
- 内容按最终渲染高度自动分页，避免长内容被同一张卡片截断。
- `---` 仍可作为手动强制分页符。
- Mermaid 代码块会在卡片重组前渲染为 SVG，并在暗色主题下强制使用可读的图表文字、连线和节点配色。
- 超过卡片导出尺寸的 Mermaid 会在卡片内自动缩放，同时在导出时按原比例追加为后续页图片。
- 将每个分页渲染为 `.red-content-section`，置入统一的 `.red-image-preview` 画布。
- 支持模板骨架、主题配色、封面风格三层独立切换。
- 小红书模板保留三等分底部互动条；微博模板使用头像、红 V、当前时间、可编辑地址和关注按钮，并禁用底部提示。
- 支持当前页和全部页导出；导出目标可配置为 vault 相对路径或系统绝对路径，输出形式可选 ZIP 压缩包或 PNG 文件夹。
- 支持导出后续行为：更新源文件 YAML frontmatter、创建发布版 Markdown，并把导出资产以 `files://` 路径写入发布版元数据。
- 支持超尺寸 Mermaid 原比例追加页导出、复制当前图到剪贴板。
- 支持预览界面语言切换，默认英文，可切换中文。
- 支持图片拖拽、缩放、四角改大小，并按图片地址哈希持久化。
- 支持表格字号缩放和拖拽缩放，并按表格文本哈希持久化。
- 支持编辑器光标到预览页、预览页点击到编辑器行号的双向联动。
- 支持头像、用户名、用户 ID、页脚文案、备忘录标题的预览内直接编辑。
- 支持背景图上传、内置背景选择、背景拖动和缩放。
- 支持主题显示/隐藏、自定义主题、自定义字体和基础排版设置。

## 实现链路

```text
Obsidian 当前文件
  -> vault.cachedRead
  -> MarkdownRenderer.render
  -> RedConverter.renderMermaidCodeBlocks
  -> RedConverter.formatContent
  -> ImgTemplateManager.applyTemplate
  -> ThemeManager.applyTheme
  -> RedView.syncFooterLayout
  -> RedView.waitForPreviewLayout
  -> RedConverter.autoPaginate
  -> ThemeManager.applyTheme
  -> RedView.syncFooterLayout
  -> setupImageZoom / setupTableResize
  -> html-to-image toBlob/toCanvas
  -> vault/文件系统写入 PNG 或 JSZip
  -> 可选 YAML frontmatter 后处理 / ClipboardItem 写剪贴板
```

首次启用插件时，Obsidian 的 Markdown 后处理器和右侧视图布局可能晚于插件视图创建完成。预览链路因此带有两层稳定化处理：渲染过程用 `previewRenderId` 丢弃过期异步结果；首轮完成后如果仍检测到原始 Mermaid 代码块，或单页内容实际溢出，会延迟执行一次 settle retry。`RedConverter` 也会展平 Obsidian 的 `markdown-preview-*` 包装层，避免整篇文档被当成不可拆分块，并在 Mermaid DOM 源码为空时从原始 Markdown fence 回填源码。

## 模块

- `src/main.ts`：插件入口，注册视图、命令、自定义 Ribbon 图标和设置页。
- `src/icons.ts`：插件自定义图标名称和 SVG 路径定义。
- `src/view.ts`：主预览视图、工具栏、底栏、导航、实时刷新、联动、导出路径解析、导出后 YAML 处理、界面语言映射、图片和表格交互。
- `src/converter.ts`：把 Obsidian 渲染后的 Markdown DOM 重组为卡片 DOM，兜底渲染 Mermaid 代码块，并在模板/主题生效后按 DOM 高度自动分页。
- `src/imgTemplates/index.ts`：12 套卡片骨架模板；小红书和微博模板有各自的社交平台头尾结构。
- `src/themeManager.ts`：把主题对象中的 inline CSS 声明应用到 DOM，过滤嵌套选择器/伪元素等非 inline 片段，切换主题时重置头部与页脚关键元素的旧 inline style，并修正 Mermaid 图表在深色卡片主题下的文字与线条对比度。
- `src/settings/settings.ts`：默认配置、主题/字体/导出/界面语言持久化管理。
- `src/settings/SettingTab.ts`：Obsidian 设置页和相关弹窗。
- `src/downloadManager.ts`：把当前页或全部分页渲染为 PNG Blob，并可打包为 ZIP。
- `src/clipboardManager.ts`：复制图片到剪贴板。
- `src/backgroundManager.ts`：背景图样式和背景设置弹窗。
- `src/templates/*.json`：从 bundle 中提取的 11 套内置主题。
- `src/assets/backgrounds.ts`：从 bundle 中提取的 6 张内置背景。

## 与发布包的关系

这个目录不是把旧 `main.js` 直接复制出来再包装，而是按 bundle 行为拆成可维护 TypeScript 模块。
`styles.css`、主题 JSON、内置背景、二维码资源直接从发布包迁移，以保证视觉资产和主要运行时行为一致。
