// Dump the assembly GLB structure: parts, meshes, materials, bounding boxes.
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const buf = await readFile(new URL("../public/assets/archive-assembly.glb", import.meta.url));
const gltf = await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "");
const scene = gltf.scene;
scene.updateMatrixWorld(true);

const parts = new Map();
scene.traverse((o) => {
  if (!o.isMesh) return;
  const part = o.userData.assemblyPart ?? "(none)";
  const box = new THREE.Box3().setFromObject(o);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  if (!parts.has(part)) parts.set(part, { meshes: [], size: new THREE.Vector3(), min: box.min.clone(), max: box.max.clone(), mats: new Set() });
  const p = parts.get(part);
  p.meshes.push(o.name);
  p.size.max(size);
  p.min.min(box.min); p.max.max(box.max);
  p.mats.add(o.material.name);
});

for (const [part, p] of parts) {
  const size = p.max.clone().sub(p.min);
  console.log(`\n=== ${part} (${p.meshes.length} meshes)`);
  console.log(`  bbox: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}  center≈(${((p.min.x+p.max.x)/2).toFixed(2)}, ${((p.min.y+p.max.y)/2).toFixed(2)}, ${((p.min.z+p.max.z)/2).toFixed(2)})  z:[${p.min.z.toFixed(2)}..${p.max.z.toFixed(2)}]`);
  console.log(`  materials: ${[...p.mats].join(", ")}`);
  console.log(`  meshes: ${p.meshes.slice(0, 10).join(", ")}${p.meshes.length > 10 ? " …" : ""}`);
}
