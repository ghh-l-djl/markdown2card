import assert from "node:assert/strict";
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runAgyCommand } from "../src/agyManager";

async function createFakeAgy(source: string): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "markdown2card-agy-"));
  const executable = path.join(directory, "agy");
  await writeFile(executable, `#!/bin/sh\n${source}\n`, "utf8");
  await chmod(executable, 0o755);
  return executable;
}

test("agy receives the complete prompt through the -p argument", async () => {
  const executable = await createFakeAgy("[ \"$1\" = \"-p\" ] || exit 9\nprintf '%s' \"$2\"");
  const prompt = "用户提示词\n\n清洗后的正文：'引号' $(不可执行)";

  assert.equal(await runAgyCommand(executable, prompt), prompt);
});

test("agy reports a non-zero exit with stderr", async () => {
  const executable = await createFakeAgy("printf '%s' '认证失败' >&2\nexit 7");

  await assert.rejects(runAgyCommand(executable, "prompt"), /认证失败/);
});

test("agy rejects an empty response", async () => {
  const executable = await createFakeAgy("exit 0");

  await assert.rejects(runAgyCommand(executable, "prompt"), /empty response/i);
});
