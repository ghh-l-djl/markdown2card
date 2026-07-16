import assert from "node:assert/strict";
import test from "node:test";
import { settingsText } from "../src/settings/settingsI18n";

test("translates the settings page when Chinese is selected", () => {
  assert.equal(settingsText("zh", "markdown2card Settings"), "markdown2card 设置");
  assert.equal(settingsText("zh", "Interface language"), "界面语言");
  assert.equal(settingsText("zh", "Export"), "导出");
  assert.equal(settingsText("zh", "Themes"), "主题");
});

test("uses the requested Chinese rabbit-code and donation copy", () => {
  assert.equal(settingsText("zh", "Activation code"), "兔兔码");
  assert.equal(settingsText("zh", "Donate"), "打赏给开发者一个比心兔兔");
});

test("keeps English settings copy unchanged", () => {
  assert.equal(settingsText("en", "Activation code"), "Activation code");
  assert.equal(settingsText("en", "Unmapped copy"), "Unmapped copy");
});
