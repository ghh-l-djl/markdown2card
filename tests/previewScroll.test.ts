import assert from "node:assert/strict";
import test from "node:test";
import { resetPreviewScroll } from "../src/previewScroll";

test("opening a file resets the preview wrapper to the top", () => {
  const wrapper = {
    scrollTop: 96,
    classList: { contains: (className: string) => className === "red-preview-wrapper" }
  } as unknown as HTMLElement;
  const preview = { parentElement: wrapper } as unknown as HTMLElement;

  resetPreviewScroll(preview);

  assert.equal(wrapper.scrollTop, 0);
});
