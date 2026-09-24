import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const children = [
  spawn(
    process.execPath,
    [path.join(root, "frontend/node_modules/next/dist/bin/next"), "dev"],
    { cwd: path.join(root, "frontend"), stdio: "inherit" },
  ),
  spawn(
    process.execPath,
    [
      path.join(root, "node_modules/tsx/dist/cli.mjs"),
      path.join(root, "workers/src/index.ts"),
    ],
    { cwd: root, stdio: "inherit" },
  ),
];
let closing = false;
function stop() {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const child of children) {
  child.on("error", (error) => {
    console.error(error.message);
    stop();
    process.exitCode = 1;
  });
  child.on("exit", (code) => {
    if (!closing) {
      process.exitCode = code || 0;
      stop();
    }
  });
}
