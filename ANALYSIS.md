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
- `src/assets/backgrounds.ts`：从 bundle 中提取 of 6 张内置背景。

## Mermaid 与分页处理逻辑

为了保证 Mermaid 图表与上下文（标题、段落）在卡片化分页时不发生文字截断、图表遮挡，以及孤立标题等问题，插件实现了一套结合 **DOM 预处理、精密高度度量、原子组粘合、以及上下文感知二次缩放** 的高准度自动分页算法。

### 1. Mermaid 上下文分页规则
针对 Mermaid 与前后文的排版，插件遵循以下四大典型场景的分页规则：
- **场景 1：仅前置标题**：当 Mermaid 前只有标题时，卡片最多保留 **2 个** 标题与 Mermaid 同页，其余标题提前进行分页。
- **场景 2：前置短文本（≤ 1 行）**：当 Mermaid 前有 1 行短描述与标题时，卡片保留 **1 个** 标题、该短描述与 Mermaid 同页，其余标题提前进行分页。
- **场景 3：前置长文本（> 1 行）**：当 Mermaid 前有长文本时，文本在分页前被二分截断：前半部分留在上一页（包含其前面的标题），而**最后 2 行文本**与 Mermaid 粘合显示在下一页。
- **场景 4：仅后置文本**：当 Mermaid 前无任何匹配文本而后面有文本时，Mermaid 与后置文本的前 **2 行** 粘合显示在当前页，其余文本（第 3 行起）在后续页显示（后置标题不进行匹配，直接换页）。

### 2. 核心度量机制：精确测量通道 (Probe)
在进行高度分割前，插件在卡片容器中创建了一个 `position: absolute; visibility: hidden;` 的 `probe` 度量容器：
- **高准度宽度对齐**：通过 `window.getComputedStyle(section)` 动态获取内容卡片的实际外边距（`margin-left/right`）与边框（`border-width`），在 `contentContainer.clientWidth` 的基础上减去这些尺寸作为 `probe` 的精确宽度，从而完全对齐浏览器的折行字符断位。
- **动态折行计算**：在 `probe` 中克隆节点，分别灌入单个字符 `"A"` 和换行字符 `"A<br>A"` 测出当前字体和字号下的 `lineHeight` 与 `paddingHeight`；之后克隆完整段落并在 `probe` 中测出 `clientHeight`，通过 `Math.round((hFull - paddingHeight) / lineHeight)` 精准求出段落在当前卡片宽度下渲染出来的**物理行数**。
- **二分查找边界切分**：当需要将文本切分为 N 行与剩余行时（场景 3/4），在 `probe` 中利用二分法快速定位字数切分点，并对齐英文单词边界（防止截断单词）将段落物理拆分为两个独立的 `<p>` 元素，中间插入虚拟分页标记 `red-page-break`。

### 3. 原子组粘合与无条件分页 (Atomic Grouping)
在进行实际的高度分页循环时，普通的块级元素逐个追加检测容易导致 Mermaid 被拆散到下一页而前置文本留在上一页：
- **粘合组识别 (`getKeepTogetherGroup`)**：通过向后扫描，把满足上述场景的 `[标题, 文本, Mermaid]` 整体识别为一个“粘合组”（作为一个不可分割的原子单元）。
- **原子级写入与分页**：在分页循环中，如果当前卡片无法完整装下该粘合组（`!fitsGroup(current, group)` 成立），则**无条件开辟新卡片**，并将整个粘合组原子化地整体写入新卡片。由于不再检查“空卡片是否能塞下组”，因此有效规避了超高图表强行堆积在满页中导致遮挡截断的问题，也彻底避免了无限重复开辟新页的 Bug。

### 4. 组感知的 Mermaid 二次精密缩放
虽然 Mermaid 在初始化时会进行一次通用缩放，但在分页循环中，同页的标题和多行文本（包含其 `margin-top/bottom` 等外边距）会占用物理高度：
- **二次缩放 (`scaleMermaidBlocksInSpecialGroups`)**：在分页切分前，针对已被识别为粘合组的 Mermaid 块，插件会将组内其余非 Mermaid 元素克隆并渲染至 `probe` 中，获取它们真实的 `clone.offsetHeight` 加上 computed style 里的段落上下外边距。
- **高度避让**：将这个累加高度作为 `reserveHeight` 从卡片可用高度中扣除，重新计算 Mermaid 的缩放比例 `scale`。Mermaid 图像将自适应等比缩小，完美避让同卡片内多行文本与标题的物理占位，确保两部分内容在卡片上均能 100% 完整显示。
