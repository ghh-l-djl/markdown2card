export interface ImageSize {
  width: number;
  height: number;
}

export interface LayoutBox {
  width: number;
  height: number;
}

export const IMAGE_CROP_HINT = "裁剪模式：图片会在固定图片框比例下保持铺满；可用 + 放大、− 回退放大（最低保持铺满），并拖动调整取景。";

export function canAdjustImageLayout(mode: "contain" | "crop"): boolean {
  return mode === "crop";
}

function isPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function calculateContainSize(
  naturalWidth: number,
  naturalHeight: number,
  availableWidth: number,
  availableHeight: number
): ImageSize {
  if (![naturalWidth, naturalHeight, availableWidth, availableHeight].every(isPositive)) return { width: 0, height: 0 };
  const scale = Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight);
  return { width: naturalWidth * scale, height: naturalHeight * scale };
}

export function calculateCoverScale(
  naturalWidth: number,
  naturalHeight: number,
  viewportWidth: number,
  viewportHeight: number
): number {
  if (![naturalWidth, naturalHeight, viewportWidth, viewportHeight].every(isPositive)) return 0;
  return Math.max(viewportWidth / naturalWidth, viewportHeight / naturalHeight);
}

export function shouldUseStandalonePage(
  naturalWidth: number,
  naturalHeight: number,
  contentWidth: number,
  pageContentHeight: number
): boolean {
  if (![naturalWidth, naturalHeight, contentWidth, pageContentHeight].every(isPositive)) return false;
  return contentWidth * naturalHeight / naturalWidth > pageContentHeight;
}

export function resolveLayoutBox(...boxes: Array<LayoutBox | null | undefined>): LayoutBox {
  for (const box of boxes) {
    if (!box) continue;
    if (isPositive(box.width) && isPositive(box.height)) return box;
  }
  return { width: 1, height: 1 };
}

export function createImageLayoutKey(notePath: string, resourcePath: string, occurrence: number): string {
  return `${encodeURIComponent(notePath)}::${encodeURIComponent(resourcePath)}::${occurrence}`;
}

interface ClassListLike {
  contains(name: string): boolean;
}

export function isExportableNode(node: { classList?: ClassListLike }): boolean {
  return !node.classList?.contains("red-editor-only");
}
