export function resetPreviewScroll(previewEl: HTMLElement | null | undefined): void {
  const wrapper = previewEl?.parentElement;
  if (!wrapper?.classList.contains("red-preview-wrapper")) return;
  wrapper.scrollTop = 0;
}
