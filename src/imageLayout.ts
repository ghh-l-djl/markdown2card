export interface ImageSize {
  width: number;
  height: number;
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

export function createImageLayoutKey(notePath: string, resourcePath: string, occurrence: number): string {
  return `${encodeURIComponent(notePath)}::${encodeURIComponent(resourcePath)}::${occurrence}`;
}

interface ClassListLike {
  contains(name: string): boolean;
}

export function isExportableNode(node: { classList?: ClassListLike }): boolean {
  return !node.classList?.contains("red-editor-only");
}
