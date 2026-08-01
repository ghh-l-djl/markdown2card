import assert from "node:assert/strict";
import test from "node:test";
import { extractBrowserPublishResults } from "../src/browserPublishResults";

test("browser publish results accept public task platforms", () => {
  assert.deepEqual(extractBrowserPublishResults({
    found: true,
    status: "success",
    platforms: [
      { id: "xiaohongshu", status: "success" },
      { id: "weibo", status: "failed" }
    ]
  }), {
    successes: ["xiaohongshu"],
    failures: ["weibo"]
  });
});

test("browser publish results keep legacy platformStates support", () => {
  assert.deepEqual(extractBrowserPublishResults({
    platformStates: [
      { platform: "xiaohongshu", success: true },
      { platform: "weibo", success: false }
    ]
  }), {
    successes: ["xiaohongshu"],
    failures: ["weibo"]
  });
});
