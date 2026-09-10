#!/usr/bin/env node
// One command that proves the working tree is internally consistent:
// type check, content/asset/loop/motion checks, and a fresh clean build.
import { spawnSync } from "node:child_process";

const checks = [
  ["typecheck", ["node_modules/typescript/bin/tsc", "--noEmit"]],
  ["content", ["scripts/check-content.mjs"]],
  ["archive", ["scripts/check-archive.mjs"]],
  ["loop", ["scripts/check-loop.mjs"]],
  ["motion", ["scripts/check-motion.mjs"]],
  ["decryption", ["scripts/check-decryption.mjs"]],
  ["appearance", ["scripts/check-appearance.mjs"]],
  ["quality", ["scripts/check-quality.mjs"]],
  ["assembly", ["scripts/check-assembly.mjs"]],
  ["assets", ["scripts/check-assets.mjs"]],
  ["shell", ["scripts/check-shell.mjs"]],
];

const failed = [];
for (const [name, args] of checks) {
  const result = spawnSync(process.execPath, args, { stdio: "pipe" });
  const ok = result.status === 0;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) {
    failed.push(name);
    const output = `${result.stdout}${result.stderr}`.trim().split("\n");
    console.log(
      output
        .slice(-6)
        .map((line) => `      ${line}`)
        .join("\n"),
    );
  }
}
if (failed.length) {
  console.error(`\n${failed.length} check(s) failed: ${failed.join(", ")}`);
  process.exit(1);
}
console.log("\nAll checks passed.");
