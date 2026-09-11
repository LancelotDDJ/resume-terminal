#!/usr/bin/env node
// Verify every themed cassette build stays inside the case's z budget.
//
// The transparent cover spans z 0.08..0.25 (from the assembly GLB dump), so
// assembled themed parts must not poke past z 0.25 on the front, and must not
// sink below the carrier's back face on the rear. This builds all fifteen
// record themes with a stub material and measures real geometry bounds —
// no screenshots, just numbers. Runs in `npm run check`.
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildThemeParts } from "../src/theme-parts.ts";

const COVER_OUTER_Z = 0.15; // original optical-core ceiling — the cover recess depth
const COVER_WARN_Z = 0.14; // warn near the recess ceiling
const BACK_MIN_Z = -0.03; // original optical-core floor — nothing sinks into the substrate

const RECORD_IDS = [
  "O-001", "O-002", "O-003", "E-001", "E-002", "I-001",
  "P-001", "P-002", "P-003", "P-004", "P-005", "P-006",
  "R-001", "R-002", "S-001",
];

const stubMat = () => new THREE.MeshStandardMaterial();
const box = new THREE.Box3();
const results = [];
let worst = { id: null, mesh: -1, zMax: -Infinity };

for (const id of RECORD_IDS) {
  const build = buildThemeParts(id, stubMat);
  assert.ok(build, `theme for ${id} must exist`);
  assert.ok(build.meshes.length > 0, `theme for ${id} must have meshes`);
  let zMax = -Infinity,
    zMin = Infinity;
  build.meshes.forEach((mesh, i) => {
    mesh.geometry.computeBoundingBox();
    box.copy(mesh.geometry.boundingBox);
    const hi = mesh.position.z + box.max.z;
    const lo = mesh.position.z + box.min.z;
    if (hi > worst.zMax) worst = { id, mesh: i, zMax: hi };
    zMax = Math.max(zMax, hi);
    zMin = Math.min(zMin, lo);
  });
  results.push({ id, parts: build.meshes.length, zMin, zMax });
  assert.ok(
    zMax <= COVER_OUTER_Z,
    `${id}: theme pokes past the transparent cover (zMax ${zMax.toFixed(3)} > ${COVER_OUTER_Z})`,
  );
  assert.ok(
    zMin >= BACK_MIN_Z,
    `${id}: theme sinks behind the substrate (zMin ${zMin.toFixed(3)} < ${BACK_MIN_Z})`,
  );
}

for (const r of results) {
  const flag = r.zMax > COVER_WARN_Z ? " ⚠" : "";
  console.log(
    `${r.id}  parts=${String(r.parts).padStart(2)}  z=[${r.zMin.toFixed(3)} .. ${r.zMax.toFixed(3)}]${flag}`,
  );
}
console.log(
  `\nAll ${results.length} themes fit inside the case (worst front z ${worst.zMax.toFixed(3)} at ${worst.id}#${worst.mesh}, cover outer ${COVER_OUTER_Z}).`,
);
