import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { buildCardImagePublishPackage } from "../src/browserPublishPackage";

test("card-image publish package uses output images in natural order", async () => {
  const dir = await mkdtemp(join(tmpdir(), "m2c-publish-"));
  try {
    const output = join(dir, "output");
    await mkdir(output);
    await writeFile(join(dir, "第0页.png"), Buffer.from([0]));
    await writeFile(join(output, "第10页.png"), Buffer.from([10]));
    await writeFile(join(output, "第2页.png"), Buffer.from([2]));
    await writeFile(join(output, "第1页.png"), Buffer.from([1]));

    const result = await buildCardImagePublishPackage([
      "---",
      "title: 示例",
      "---",
      "正文第一行",
      "正文第二行"
    ].join("\n"), {
      title: "示例标题",
      assets: pathToFileURL(dir).toString(),
      publish_social_tags: ["AI", "#Obsidian"]
    });

    assert.deepEqual(result.assets.map((asset) => asset.filename), ["第1页.png", "第2页.png", "第10页.png"]);
    assert.equal(result.cover, "asset://image-1");
    assert.match(result.markdown, /!\[第1页\.png\]\(asset:\/\/image-1\)/);
    assert.deepEqual(result.tags, ["AI", "Obsidian"]);
    assert.equal(result.content.trim(), "正文第一行\n正文第二行");
    assert.doesNotMatch(result.markdown, /#AI #Obsidian$/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("card-image publish package blocks unsupported image formats", async () => {
  const dir = await mkdtemp(join(tmpdir(), "m2c-publish-"));
  try {
    await writeFile(join(dir, "cover.gif"), Buffer.from([1]));
    await assert.rejects(
      buildCardImagePublishPackage("body", { title: "t", assets: pathToFileURL(dir).toString() }),
      /不支持的图片格式/
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("card-image publish package keeps only the first 18 images", async () => {
  const dir = await mkdtemp(join(tmpdir(), "m2c-publish-"));
  try {
    for (let index = 1; index <= 20; index++) {
      await writeFile(join(dir, `第${index}页.png`), Buffer.from([index]));
    }

    const result = await buildCardImagePublishPackage("body", {
      title: "t",
      assets: pathToFileURL(dir).toString()
    });

    assert.equal(result.assets.length, 18);
    assert.equal(result.assets.at(-1)?.filename, "第18页.png");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
