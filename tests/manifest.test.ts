import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

interface PluginManifest {
  id: string;
  version: string;
}

const manifest = JSON.parse(
  readFileSync(new URL("../manifest.json", import.meta.url), "utf8"),
) as PluginManifest;

test("community plugin id follows Obsidian manifest requirements", () => {
  assert.match(manifest.id, /^[a-z]+(?:-[a-z]+)*$/);
  assert.doesNotMatch(manifest.id, /obsidian/);
  assert.equal(manifest.id.endsWith("plugin"), false);
});

test("package and manifest versions stay synchronized", () => {
  const packageJson = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { version: string };

  assert.equal(packageJson.version, manifest.version);
});
