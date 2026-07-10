import assert from "node:assert/strict";
import test from "node:test";
import { removeMarkdownImages } from "../src/markdownContent";

test("AI rewrite content removes Obsidian embeds and Markdown images", () => {
  const markdown = [
    "开头正文。",
    "",
    "![[assets/cover.png|封面]]",
    "",
    "中间内容 ![示意图](images/example.png \"标题\") 继续说明。",
    "",
    "结尾正文。"
  ].join("\n");

  assert.equal(
    removeMarkdownImages(markdown),
    [
      "开头正文。",
      "",
      "中间内容 继续说明。",
      "",
      "结尾正文。"
    ].join("\n")
  );
});

test("non-image Obsidian embeds remain in AI rewrite content", () => {
  const markdown = [
    "![[另一篇笔记]]",
    "![[附件.pdf]]",
    "![[photo.webp|300]]"
  ].join("\n");

  assert.equal(
    removeMarkdownImages(markdown),
    ["![[另一篇笔记]]", "![[附件.pdf]]"].join("\n")
  );
});

test("image syntax used as code remains in AI rewrite content", () => {
  const markdown = [
    "示例：`![说明](image.png)`",
    "",
    "```md",
    "![[assets/example.png]]",
    "![说明](image.png)",
    "```",
    "",
    "![[assets/real.png]]"
  ].join("\n");

  assert.equal(
    removeMarkdownImages(markdown),
    [
      "示例：`![说明](image.png)`",
      "",
      "```md",
      "![[assets/example.png]]",
      "![说明](image.png)",
      "```"
    ].join("\n")
  );
});

test("image-free Markdown keeps its original whitespace", () => {
  const markdown = "  缩进正文\n\n\n下一段\n";

  assert.equal(removeMarkdownImages(markdown), markdown);
});
