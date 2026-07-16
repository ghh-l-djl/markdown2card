import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

interface PluginManifest {
  description: string;
  id: string;
  name: string;
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

test("community plugin uses the searchable display name", () => {
  assert.equal(manifest.name, "markdown to card");
});

test("package and manifest versions stay synchronized", () => {
  const packageJson = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { version: string };

  assert.equal(packageJson.version, manifest.version);
});

test("community plugin description follows Obsidian requirements", () => {
  assert.doesNotMatch(manifest.description, /obsidian/i);
  assert.match(manifest.description, /[.!?]$/);
});
