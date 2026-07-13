const { spawnSync } = require("node:child_process");

const args = process.argv.slice(2);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit"
  });

  if (result.error !== undefined) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (process.platform === "win32") {
  run(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", npmCommand, "run", "build"]);
} else {
  run(npmCommand, ["run", "build"]);
}

run(process.execPath, ["dist/src/index.js", ...args]);
