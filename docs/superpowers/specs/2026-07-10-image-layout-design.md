# Markdown 正文图片布局与长图处理设计

## 背景

当前正文图片在自动分页后才被包装成可拖拽裁剪框。图片原本受到 `252px/310px` 的最大高度限制，包装后图片恢复自然比例，但外层框继续保留旧高度并使用 `overflow: hidden`。这导致手机竖屏截图和长图默认只显示局部，同时用户调整图片后，分页结果也不会重新反映真实布局。

本设计重新定义正文图片的默认展示、长图分页、可选裁剪、状态持久化和导出行为。

## 核心原则

1. 默认不丢失图片内容，所有正文图片优先完整显示并保持原始宽高比。
2. 长图不切片、不跨卡片，也不与文字共页；每张长图独占一张完整卡片。
3. 长图应尽量占满卡片的可用内容区。图片比例与内容区不一致时允许留白，不允许默认裁切。
4. 独占图片页保留主题背景、页眉和页脚，维持整组导出图片的视觉一致性。
5. 裁剪必须是用户主动选择的模式，不能作为图片的默认行为。
6. 图片布局必须在自动分页前确定，交互调整不能破坏已经确定的页面占位。
7. 图片实例状态彼此独立；相同图片在不同笔记或同一笔记的不同位置不得共享裁剪状态。

## 默认展示与长图判定

所有正文图片默认使用完整显示模式：

- 保持原始宽高比；
- 受卡片内容区最大宽度和最大高度约束；
- 不创建隐式裁剪窗口；
- 不显示拖动和四角缩放控件。

长图不使用固定宽高比阈值判断，而是基于当前模板的实际可用空间动态判断。将图片按内容区宽度等比展示：

```ts
const widthFittedHeight = contentWidth * naturalHeight / naturalWidth;
const standalone = widthFittedHeight > pageContentHeight;
```

如果所需高度超过整页可用内容高度，该图片即为长图，并进入独占页。这样可以自然适配不同模板、内边距、页眉和页脚高度。

独占页的完整显示尺寸按以下比例计算：

```ts
const scale = Math.min(
  contentWidth / naturalWidth,
  pageContentHeight / naturalHeight
);
```

图片在可用内容区内水平、垂直居中。

## 分页规则

图片作为明确的分页块参与排版：

- 普通图片能够放入当前页时，可以与文字同页；
- 长图严格独占一页，即使前一页仍有剩余空间也不塞入；
- 图片前的内容在图片页之前结束；
- 图片后的内容从下一页开始；
- 连续长图每张各占一页；
- 同一段中的多张图片先拆为独立图片块，再逐张判断；
- 第一版不实现多图拼图、双列布局或自动切片。

## 图片模式

### 完整显示模式

这是所有正文图片的默认模式：

- 图片使用类似 `object-fit: contain` 的效果；
- 完整内容始终可见；
- 普通图由当前分页空间决定占位；
- 长图使用独占页的整个可用内容区；
- 不允许拖动，因为完整显示状态下拖动没有明确意义。

### 裁剪模式

用户可主动将图片切换为裁剪模式：

- 独占图片页的裁剪框铺满卡片内容区；
- 普通图文页保持切换前的图片占位尺寸；
- 图片以类似 `cover` 的方式填充裁剪框；
- 用户可以拖动图片选择可见区域，并可以放大或缩小；
- “重置裁剪”恢复裁剪参数，但不退出裁剪模式；
- “完整显示”用于退出裁剪模式；
- 切换模式不改变页面占位尺寸，因此不触发分页跳动。

裁剪框尺寸由卡片版面决定，不再允许通过四角控制点任意修改宽高。

## 渲染与分页顺序

新的处理顺序必须是：

```text
MarkdownRenderer 渲染
→ 解析正文图片
→ 等待图片加载
→ 读取 naturalWidth / naturalHeight
→ 建立稳定的图片展示结构
→ 计算完整显示尺寸
→ 标记普通图片或独占图片
→ 自动分页
→ 初始化完整显示/裁剪交互
→ 导出
```

图片的结构和占位必须在 `RedConverter.autoPaginate()` 之前完成。用户在裁剪模式中的位移和缩放只改变图片在固定视口内的呈现，不改变分页尺寸。

## 建议的 DOM 与样式状态

```html
<figure
  class="red-content-image red-image-standalone red-image-mode-contain"
  data-image-mode="contain"
  data-image-layout="standalone"
>
  <div class="red-content-image-viewport">
    <img>
  </div>
  <div class="red-image-controls red-editor-only"></div>
</figure>
```

使用明确的状态类表达布局和模式：

- `.red-image-inline`
- `.red-image-standalone`
- `.red-image-mode-contain`
- `.red-image-mode-crop`
- `.red-editor-only`

避免继续让 `.red-img-frame` 同时承担布局、分页、裁剪和缩放职责。

## 状态持久化

插件没有存量用户，因此直接删除旧的 `imageScales` 字段、`ImageState` 类型以及相关读写和兼容逻辑。

新增结构：

```ts
interface ImageLayoutState {
  mode: "contain" | "crop";
  scale: number;
  offsetX: number;
  offsetY: number;
}

imageLayouts: Record<string, ImageLayoutState>;
```

状态键由以下信息组成：

```text
笔记路径 + 图片资源路径 + 图片在当前笔记中的出现序号
```

只保存展示模式、裁剪缩放和位移，不保存裁剪框宽高。裁剪框尺寸始终由卡片布局计算。

## 导出行为

所有模式按钮、裁剪控制和交互层都标记为 `.red-editor-only`。`html-to-image` 导出时通过 `filter` 明确排除这些节点，不依赖透明度或悬停状态隐藏：

```ts
filter: (node) =>
  !(node instanceof HTMLElement) ||
  !node.classList.contains("red-editor-only")
```

导出结果必须与当前图片模式一致，但不得包含任何编辑器控制元素。

## 可测试的尺寸逻辑

将核心几何计算提取为不依赖 DOM 的纯函数：

```ts
calculateContainSize(
  naturalWidth,
  naturalHeight,
  availableWidth,
  availableHeight
)

calculateCoverScale(
  naturalWidth,
  naturalHeight,
  viewportWidth,
  viewportHeight
)

shouldUseStandalonePage(
  naturalWidth,
  naturalHeight,
  contentWidth,
  pageContentHeight
)
```

建议使用 `tsx` 配合 Node 20 内置的 `node:test`，新增 `npm test`。测试至少覆盖：

- 横图和普通竖图完整显示；
- 长图动态判定；
- 长图独占分页；
- `contain` 保持比例且不裁切；
- `crop` 正确填满视口；
- 模板、页眉或页脚尺寸变化后重新判断；
- 相同图片的多个实例状态互不干扰；
- 连续长图分别独占页面；
- 图片前后文字不会进入独占图片页；
- 导出过滤编辑器控制元素。

## 实施顺序

1. 提取图片尺寸计算纯函数并添加测试。
2. 引入新的图片 DOM、布局类型和状态类型。
3. 在分页前完成图片加载、识别和稳定占位。
4. 修改分页器以支持独占图片块。
5. 实现完整显示和可选裁剪模式。
6. 新增 `imageLayouts` 持久化。
7. 删除 `imageScales`、旧四角缩放和旧裁剪框实现。
8. 在导出阶段过滤编辑器控制元素。
9. 运行 `npm test` 和 `npm run build`。
10. 在 Obsidian 中手动验证横图、普通竖图、手机长截图、连续长图和同图多次引用。

## 验收标准

- 新插入的正文图片默认完整可见，不发生隐式裁切；
- 手机长截图独占一张卡片，并在保留页眉页脚的前提下尽量占满内容区；
- 长图不切片、不跨页、不与文字共页；
- 用户可以主动进入裁剪模式并保存每个图片实例的裁剪状态；
- 切换或调整裁剪不改变分页占位；
- 导出 PNG 不包含图片控制按钮或交互层；
- 所有自动化测试和生产构建通过。

