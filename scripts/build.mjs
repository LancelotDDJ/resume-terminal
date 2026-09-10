#!/usr/bin/env node
// Clean-slate production build.
//
// The generated artifacts must never lag behind the sources: content changes
// produce new TXT exports, deleted records must disappear from dist/, and the
// bundle has to match src/. So every build starts by clearing dist/ completely
// and re-exporting the downloadable records before Vite runs.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { build } from "vite";

const root = process.cwd();
const dist = path.join(root, "dist");

function clearDist() {
  if (!existsSync(dist)) return;
  try {
    rmSync(dist, { recursive: true, force: true });
    return;
  } catch {
    // Restricted environments may intercept recursive deletes. Renaming the
    // old output gives the same clean slate without touching the files.
    const stale = `${dist}-stale-${Date.now()}`;
    renameSync(dist, stale);
    console.log(
      `[build] dist/ could not be removed here — moved aside to ${path.basename(stale)}`,
    );
  }
}

function countFiles(dir) {
  let total = 0;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    total += statSync(full).isDirectory() ? countFiles(full) : 1;
  }
  return total;
}

const startedAt = Date.now();
clearDist();
execFileSync(process.execPath, ["scripts/export-records.mjs"], {
  stdio: "inherit",
});
execFileSync(process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit"], {
  stdio: "inherit",
});
await build({ logLevel: "warn" });
const seconds = ((Date.now() - startedAt) / 1000).toFixed(2);
console.log(
  `[build] dist/ refreshed from current sources — ${countFiles(dist)} files in ${seconds}s`,
);
