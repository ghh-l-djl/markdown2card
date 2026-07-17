import { execFile } from "child_process";
import path from "node:path";

export interface AgyCommandOptions {
  proxyUrl?: string;
  noProxy?: string;
}

export async function runAgyCommand(executablePath: string, prompt: string, options: AgyCommandOptions = {}): Promise<string> {
  const executable = executablePath.trim();
  if (!executable) throw new Error("agy executable path is not configured");

  const env = { ...process.env };
  const userLocalBin = env.HOME && path.join(env.HOME, ".local", "bin");
  env.PATH = [userLocalBin, env.PATH].filter(Boolean).join(path.delimiter);
  const proxyUrl = options.proxyUrl?.trim();
  const noProxy = options.noProxy?.trim();
  if (proxyUrl) {
    env.http_proxy = proxyUrl;
    env.HTTP_PROXY = proxyUrl;
    env.https_proxy = proxyUrl;
    env.HTTPS_PROXY = proxyUrl;
    env.all_proxy = proxyUrl;
    env.ALL_PROXY = proxyUrl;
  }
  if (noProxy) {
    env.no_proxy = noProxy;
    env.NO_PROXY = noProxy;
  }

  return new Promise((resolve, reject) => {
    execFile(executable, ["-p", prompt], { env, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const detail = stderr.trim() || error.message;
        reject(new Error(`agy command failed: ${detail}`));
        return;
      }

      const output = stdout.trim();
      if (!output) {
        reject(new Error("agy command returned an empty response"));
        return;
      }
      resolve(output);
    });
  });
}
