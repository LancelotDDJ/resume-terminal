import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Runtime GLB assets are frozen for this site. Guard them against
// accidental modification or corruption with hashes plus a structural
// parse (replaces the upstream baseline-comparison optics check).
const EXPECTED = {
  "../public/assets/archive-assembly.glb": {
    sha256: "d411170676f55a327c286e67e462f98b446667811c725318bab85657eaee06ec",
  },
  "../public/assets/archive-cassette.glb": {
    sha256: "dda42b9b3b471d11c69820a64084d254a64b27761287ab0e35dd8387ec0a0bed",
  },
};

const loader = new GLTFLoader();
const report = {};
for (const [path, expected] of Object.entries(EXPECTED)) {
  const buffer = await readFile(new URL(path, import.meta.url));
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  assert.equal(sha256, expected.sha256, `${path} hash mismatch`);
  const scene = (
    await loader.parseAsync(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      "",
    )
  ).scene;
  let meshes = 0;
  let tagged = 0;
  scene.traverse((object) => {
    if (!object.isMesh) return;
    meshes += 1;
    if (object.userData.assemblyPart) tagged += 1;
  });
  assert.ok(meshes > 0, `${path} contains no meshes`);
  report[path.split("/").pop()] = { sha256: sha256.slice(0, 12), meshes, tagged };
}
console.log(JSON.stringify({ passed: true, assets: report }, null, 2));
