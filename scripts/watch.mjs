#!/usr/bin/env node
// Keep the built site current while editing.
//
// Watches the content and source trees and runs the full clean build after
// every settled change, so dist/ (and anything served from it) always matches
// the files on disk. Content edits additionally refresh the TXT exports.
import { spawn } from "node:child_process";
import { existsSync, watch } from "node:fs";
import path from "node:path";

const root = process.cwd();
const targets = ["content", "src", "index.html", "vite.config.ts"].filter(
  (entry) => existsSync(path.join(root, entry)),
);

let timer = null;
let building = false;
let pending = false;
let lastReason = "";

function stamp() {
  return new Date().toTimeString().slice(0, 8);
}

function runBuild(reason) {
  if (building) {
    pending = true;
    return;
  }
  building = true;
  console.log(`[${stamp()}] ${reason} → rebuilding`);
  const child = spawn(process.execPath, ["scripts/build.mjs"], {
    stdio: "inherit",
  });
  child.on("exit", (code) => {
    building = false;
    if (code !== 0) console.error(`[${stamp()}] build failed (exit ${code})`);
    else console.log(`[${stamp()}] dist/ up to date`);
    if (pending) {
      pending = false;
      runBuild("queued change");
    }
  });
}

function schedule(reason) {
  lastReason = reason;
  clearTimeout(timer);
  timer = setTimeout(() => runBuild(reason), 300);
}

for (const target of targets) {
  watch(path.join(root, target), { recursive: true }, (_event, file) => {
    const changed = path
      .relative(root, path.join(target, file ?? ""))
      .split(path.sep)
      .join("/");
    if (/\.(ts|css|html|json)$/.test(changed) || !path.extname(changed)) {
      schedule(`${changed} changed`);
    }
  });
}

runBuild(`initial build (watching ${targets.join(", ")})`);
console.log("Press Ctrl+C to stop watching.");
process.on("SIGINT", () => process.exit(0));
