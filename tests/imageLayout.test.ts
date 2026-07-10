import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateContainSize,
  calculateCoverScale,
  createImageLayoutKey,
  isExportableNode,
  shouldUseStandalonePage
} from "../src/imageLayout";

test("contain preserves landscape and portrait image ratios without cropping", () => {
  assert.deepEqual(calculateContainSize(1600, 900, 400, 500), { width: 400, height: 225 });
  const portrait = calculateContainSize(800, 1200, 400, 500);
  assert.ok(Math.abs(portrait.width - 1000 / 3) < 1e-9);
  assert.equal(portrait.height, 500);
});

test("standalone classification follows the current page geometry", () => {
  assert.equal(shouldUseStandalonePage(1080, 2400, 400, 700), true);
  assert.equal(shouldUseStandalonePage(1080, 1600, 400, 700), false);
  assert.equal(shouldUseStandalonePage(1080, 1600, 500, 700), true);
  assert.equal(shouldUseStandalonePage(1080, 1600, 400, 560), true);
});

test("cover fills the viewport", () => {
  assert.equal(calculateCoverScale(1600, 900, 400, 400), 4 / 9);
  assert.equal(calculateCoverScale(800, 1200, 400, 300), 0.5);
});

test("layout keys isolate repeated image instances and notes", () => {
  const first = createImageLayoutKey("notes/a.md", "assets/photo.png", 0);
  assert.notEqual(first, createImageLayoutKey("notes/a.md", "assets/photo.png", 1));
  assert.notEqual(first, createImageLayoutKey("notes/b.md", "assets/photo.png", 0));
});

test("export filter excludes editor-only controls", () => {
  assert.equal(isExportableNode({ classList: { contains: (name: string) => name === "red-editor-only" } }), false);
  assert.equal(isExportableNode({ classList: { contains: () => false } }), true);
  assert.equal(isExportableNode({}), true);
});
