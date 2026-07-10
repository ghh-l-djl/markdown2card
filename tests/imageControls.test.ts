import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const viewSource = readFileSync(new URL("../src/view.ts", import.meta.url), "utf8");

test("image controls are anchored to the visible image viewport", () => {
  assert.match(
    viewSource,
    /const controls = viewport\.createEl\("div", \{ cls: "red-image-controls red-editor-only" \}\)/
  );
});

test("image control buttons keep readable colors in every interaction state", () => {
  assert.match(
    styles,
    /\.red-image-preview \.red-image-control-button\s*\{[^}]*background-color:\s*#111827\s*!important;[^}]*color:\s*#fff\s*!important;[^}]*-webkit-text-fill-color:\s*#fff\s*!important;[^}]*background-image:\s*none\s*!important;/s
  );
  assert.match(
    styles,
    /\.red-image-preview \.red-image-control-button:is\(:hover, :focus-visible, :active\)\s*\{[^}]*background-color:\s*#030712\s*!important;[^}]*color:\s*#fff\s*!important;/s
  );
});
