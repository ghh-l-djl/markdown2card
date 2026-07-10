import assert from "node:assert/strict";
import test from "node:test";
import { pairBlocksWithSourceLines, resolvePageLineMap } from "../src/sourceLineMap";

test("automatically paginated cards keep the source line of their first block", () => {
  const blocks = ["intro", "details", "summary"];
  const sections = [
    { type: "paragraph", position: { start: { line: 0 } } },
    { type: "heading", position: { start: { line: 20 } } },
    { type: "paragraph", position: { start: { line: 40 } } }
  ];

  assert.deepEqual(pairBlocksWithSourceLines(blocks, sections), [
    { block: "intro", sourceLine: 0 },
    { block: "details", sourceLine: 20 },
    { block: "summary", sourceLine: 40 }
  ]);
  assert.deepEqual(resolvePageLineMap([0, 20, 40], [0, 0, 0]), [0, 20, 40]);
});

test("non-rendered frontmatter does not shift rendered block source lines", () => {
  const blocks = ["title", "body"];
  const sections = [
    { type: "yaml", position: { start: { line: 0 } } },
    { type: "heading", position: { start: { line: 4 } } },
    { type: "paragraph", position: { start: { line: 5 } } }
  ];

  assert.deepEqual(pairBlocksWithSourceLines(blocks, sections), [
    { block: "title", sourceLine: 4 },
    { block: "body", sourceLine: 5 }
  ]);
});

test("page line mapping falls back only when a page has no source metadata", () => {
  assert.deepEqual(resolvePageLineMap([0, null, 40], [0, 20, 20]), [0, 20, 40]);
});
