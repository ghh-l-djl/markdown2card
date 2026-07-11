import { execFile } from "child_process";

export async function runAgyCommand(executablePath: string, prompt: string): Promise<string> {
  const executable = executablePath.trim();
  if (!executable) throw new Error("agy executable path is not configured");

  return new Promise((resolve, reject) => {
    execFile(executable, ["-p", prompt], { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
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
