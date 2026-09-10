// Analyze which cassette meshes live inside the theme zone vs the frame.
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const buf = await readFile(new URL("../public/assets/archive-cassette.glb", import.meta.url));
const gltf = await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "");
const scene = gltf.scene;
scene.updateMatrixWorld(true);

// Theme zone: the middle optical region (from the assembly dump).
const ZONE = { x0: -1.4, x1: 1.7, y0: 0.8, y1: 3.05, z0: -0.05, z1: 0.18 };
const v = new THREE.Vector3();
scene.traverse((o) => {
  if (!o.isMesh) return;
  const pos = o.geometry.attributes.position;
  let inside = 0;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
    if (v.x > ZONE.x0 && v.x < ZONE.x1 && v.y > ZONE.y0 && v.y < ZONE.y1 && v.z > ZONE.z0 && v.z < ZONE.z1) inside++;
  }
  const pct = ((inside / pos.count) * 100).toFixed(0);
  console.log(`${o.material.name.replace(/\.\d+$/, "").padEnd(28)} verts=${String(pos.count).padStart(6)}  in-zone=${pct}%`);
});
