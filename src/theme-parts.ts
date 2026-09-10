// Per-record themed center modules for the archive cassette. The outer case,
// fasteners, optical cover, substrate and carrier stay untouched; the middle
// "optical-core / optical-lenses" zone becomes a small relief diorama that
// tells the record's story at a glance.
//
// Everything is built from the same flat, beveled relief vocabulary and the
// same named materials as the original Blender model (Internal_Ceramic,
// Amber_Optical_Inlay, Subsurface_Optics, Optical_Film(_Edge), Optical_Edges,
// Champagne_Index), so the themed parts morph with the same appearance
// system and read as one object with the case.
import * as THREE from "three";

export interface ThemePartLabels {
  label: string;
  en: string;
}
export interface ThemeBuild {
  meshes: THREE.Mesh[];
  labels: { lenses: ThemePartLabels; core: ThemePartLabels };
}

type MatFactory = (name: string) => THREE.Material;
type Part = "optical-core" | "optical-lenses";

function tag(
  mesh: THREE.Mesh,
  surface: string,
  part: Part,
): THREE.Mesh {
  mesh.userData.surface = surface;
  mesh.userData.assemblyPart = part;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

// Flat cylinder facing +Z (a coin/disc in the cassette plane).
function disc(
  radius: number,
  height: number,
  segments = 24,
): THREE.CylinderGeometry {
  const g = new THREE.CylinderGeometry(radius, radius, height, segments);
  g.rotateX(Math.PI / 2);
  return g;
}

// Thin bar stretched between two points in the XY plane.
function bar2D(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  depth: number,
): THREE.BoxGeometry {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const g = new THREE.BoxGeometry(width, length, depth);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const matrix = new THREE.Matrix4()
    .makeRotationZ(angle - Math.PI / 2)
    .setPosition((x1 + x2) / 2, (y1 + y2) / 2, 0);
  g.applyMatrix4(matrix);
  return g;
}

function relief(
  shape: THREE.Shape,
  depth: number,
  bevel = 0.015,
): THREE.ExtrudeGeometry {
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 24,
  });
}

// Rounded-rect outline (frame) with a matching hole.
function frameShape(
  w: number,
  h: number,
  r: number,
  inset: number,
): THREE.Shape {
  const round = (width: number, height: number, radius: number) => {
    const s = new THREE.Shape();
    const x = -width / 2,
      y = -height / 2;
    s.moveTo(x + radius, y);
    s.lineTo(x + width - radius, y);
    s.absarc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
    s.lineTo(x + width, y + height - radius);
    s.absarc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2);
    s.lineTo(x + radius, y + height);
    s.absarc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI);
    s.lineTo(x, y + radius);
    s.absarc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5);
    return s;
  };
  const outer = round(w, h, r);
  outer.holes.push(
    new THREE.Path(round(w - inset * 2, h - inset * 2, Math.max(0.02, r - inset)).getPoints(24)),
  );
  return outer;
}

const C = { x: 0.16, y: 1.92 }; // theme zone centre in model space

// ---- shared constructivist vocabulary --------------------------------------
// Thin elliptical band (an orbit ring) built as an extruded annulus.
function orbitShape(rx: number, ry: number, tube: number): THREE.Shape {
  const outer = new THREE.Shape();
  outer.absellipse(0, 0, rx, ry, 0, Math.PI * 2);
  outer.holes.push(
    new THREE.Path(
      new THREE.EllipseCurve(0, 0, rx - tube, ry - tube).getPoints(64),
    ),
  );
  return outer;
}
// Annular sector from angle a0 to a1 (radians, CCW), for route arcs.
function arcBandShape(radius: number, width: number, a0: number, a1: number): THREE.Shape {
  const s = new THREE.Shape();
  const r1 = radius + width / 2,
    r0 = radius - width / 2;
  s.absarc(0, 0, r1, a0, a1, false);
  s.absarc(0, 0, r0, a1, a0, true);
  s.closePath();
  return s;
}
// Four-ray starburst: thin bars at 0/45/90/135 degrees around a point.
function starburstBars(
  x: number,
  y: number,
  inner: number,
  outer: number,
  width: number,
  depth: number,
): THREE.BufferGeometry[] {
  const geos: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 4;
    geos.push(
      bar2D(
        x + Math.cos(a) * inner,
        y + Math.sin(a) * inner,
        x + Math.cos(a) * outer,
        y + Math.sin(a) * outer,
        width,
        depth,
      ),
    );
  }
  return geos;
}
// Dots distributed along a quadratic bezier curve.
function curveDots(
  from: [number, number],
  ctrl: [number, number],
  to: [number, number],
  count: number,
): [number, number][] {
  const curve = new THREE.QuadraticBezierCurve(
    new THREE.Vector2(...from),
    new THREE.Vector2(...ctrl),
    new THREE.Vector2(...to),
  );
  const pts: [number, number][] = [];
  for (let i = 1; i <= count; i++) {
    const p = curve.getPoint(i / (count + 1));
    pts.push([p.x, p.y]);
  }
  return pts;
}

// ---- organic forms ----------------------------------------------------------
// A smooth pebble: a sphere flattened along the cassette's depth axis.
function pebble(radius: number, flattenZ: number): THREE.SphereGeometry {
  const g = new THREE.SphereGeometry(radius, 24, 16);
  g.scale(1, 1, flattenZ);
  return g;
}
// A droplet standing on its tip: lathe profile rising along +Z, fully rounded.
function droplet(radius: number, height: number): THREE.LatheGeometry {
  const pts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(radius * 0.62, height * 0.06),
    new THREE.Vector2(radius, height * 0.3),
    new THREE.Vector2(radius * 0.82, height * 0.58),
    new THREE.Vector2(radius * 0.4, height * 0.82),
    new THREE.Vector2(0, height),
  ];
  const g = new THREE.LatheGeometry(pts, 28);
  g.rotateX(Math.PI / 2);
  return g;
}
// A lathed apple: dimpled crown, full hips, no straight lines anywhere.
function appleForm(radius: number, height: number): THREE.LatheGeometry {
  const pts = [
    new THREE.Vector2(0.015, 0),
    new THREE.Vector2(radius * 0.6, height * 0.02),
    new THREE.Vector2(radius * 0.98, height * 0.22),
    new THREE.Vector2(radius, height * 0.48),
    new THREE.Vector2(radius * 0.88, height * 0.72),
    new THREE.Vector2(radius * 0.55, height * 0.9),
    new THREE.Vector2(radius * 0.34, height * 0.97),
    new THREE.Vector2(radius * 0.3, height * 0.88),
    new THREE.Vector2(radius * 0.12, height * 0.86),
    new THREE.Vector2(0, height * 0.88),
  ];
  const g = new THREE.LatheGeometry(pts, 32);
  g.rotateX(Math.PI / 2);
  g.scale(1, 1, 0.85);
  return g;
}

// The detail cassette merges its inner refractive rings into the same
// Optical_Edges mesh as the case frame, so the themed build swaps in this
// procedural frame to keep the edge while dropping the old rings.
export function buildCaseFrame(mat: MatFactory): THREE.Mesh {
  const frame = new THREE.Mesh(
    relief(frameShape(4.86, 3.56, 0.14, 0.12), 0.16, 0.02),
    mat("Optical_Edges"),
  );
  frame.position.set(0, 1.85, 0);
  return tag(frame, "Optical_Edges", "optical-core");
}

// ---------------------------------------------------------------- R-001 ----
// Forgetting-kernel thesis, organic reading: pebble nodes woven into one
// continuous flowing loop, cross-linked by curved strands that dive into the
// pebbles — a mycelium-like whole around a smooth amber kernel droplet.
function buildNetwork(mat: MatFactory): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  const add = (
    geometry: THREE.BufferGeometry,
    material: string,
    part: Part,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = tag(new THREE.Mesh(geometry, mat(material)), material, part);
    mesh.position.set(x, y, z);
    meshes.push(mesh);
  };

  const nodes: THREE.Vector3[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    nodes.push(
      new THREE.Vector3(
        C.x + Math.cos(a) * 1.2,
        C.y + Math.sin(a) * 0.82,
        0.07,
      ),
    );
  }
  // One continuous flowing loop visiting every pebble (the connective tissue).
  const loop = new THREE.CatmullRomCurve3(nodes, true, "centripetal", 0.9);
  add(
    new THREE.TubeGeometry(loop, 120, 0.024, 10, true),
    "Optical_Film_Edge",
    "optical-core",
    0,
    0,
    0,
  );
  // Curved cross-links that dive into the pebbles at both ends.
  for (const [a, b] of [[0, 3], [1, 4], [2, 5], [6, 1], [7, 2]] as const) {
    const mid = nodes[a].clone().lerp(nodes[b], 0.5);
    mid.x = C.x + (mid.x - C.x) * 0.35;
    mid.y = C.y + (mid.y - C.y) * 0.35;
    mid.z = 0.09;
    const curve = new THREE.CatmullRomCurve3([nodes[a], mid, nodes[b]]);
    add(
      new THREE.TubeGeometry(curve, 40, 0.018, 8, false),
      "Optical_Film_Edge",
      "optical-core",
      0,
      0,
      0,
    );
  }
  nodes.forEach((n, i) => {
    add(
      pebble(0.082, 0.5),
      i % 3 === 0 ? "Champagne_Index" : "Subsurface_Optics",
      "optical-core",
      n.x,
      n.y,
      n.z,
    );
  });
  // Kernel: a smooth amber droplet rising from the mesh, with a soft halo.
  add(droplet(0.1, 0.24), "Amber_Optical_Inlay", "optical-core", C.x, C.y, 0.03);
  add(
    new THREE.TorusGeometry(0.2, 0.015, 12, 48),
    "Amber_Optical_Inlay",
    "optical-lenses",
    C.x,
    C.y,
    0.1,
  );
  return meshes;
}

// ---------------------------------------------------------------- P-002 ----
// Voyager, organic reading: the journey is one undulating closed ribbon that
// loops the center; a droplet pin stands on it, pebble stops ride along, and
// a soft compass sits calmly at the middle.
function buildVoyage(mat: MatFactory): ThemeBuild["meshes"] {
  const meshes: THREE.Mesh[] = [];
  const add = (
    geometry: THREE.BufferGeometry,
    material: string,
    part: Part,
    x: number,
    y: number,
    z: number,
    rz = 0,
  ) => {
    const mesh = tag(new THREE.Mesh(geometry, mat(material)), material, part);
    mesh.position.set(x, y, z);
    mesh.rotation.z = rz;
    meshes.push(mesh);
  };

  // Undulating journey ribbon (never a perfect circle).
  const ribbonPts: THREE.Vector3[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const wobble = 1 + 0.09 * Math.sin(a * 3 + 0.6);
    ribbonPts.push(
      new THREE.Vector3(
        C.x + Math.cos(a) * 1.0 * wobble,
        C.y + Math.sin(a) * 0.74 * wobble,
        0.06,
      ),
    );
  }
  const ribbon = new THREE.CatmullRomCurve3(ribbonPts, true, "centripetal", 0.9);
  add(
    new THREE.TubeGeometry(ribbon, 140, 0.03, 12, true),
    "Amber_Optical_Inlay",
    "optical-core",
    0,
    0,
    0,
  );
  // Pebble stops resting on the ribbon.
  for (const t of [0.16, 0.42, 0.66, 0.88]) {
    const p = ribbon.getPoint(t);
    add(pebble(0.05, 0.5), "Champagne_Index", "optical-core", p.x, p.y, p.z + 0.03);
  }
  // A droplet pin standing on the ribbon's highest point.
  const pinAt = ribbon.getPoint(0.97);
  add(droplet(0.09, 0.34), "Amber_Optical_Inlay", "optical-core", pinAt.x, pinAt.y, pinAt.z);
  // Compass: two soft nested rings with a capsule needle.
  add(
    new THREE.TorusGeometry(0.19, 0.02, 12, 48),
    "Champagne_Index",
    "optical-lenses",
    C.x,
    C.y,
    0.1,
  );
  const needle = new THREE.CapsuleGeometry(0.026, 0.2, 6, 10);
  needle.rotateZ(-0.7);
  add(needle, "Amber_Optical_Inlay", "optical-core", C.x, C.y, 0.085);
  add(pebble(0.045, 0.55), "Amber_Optical_Inlay", "optical-core", C.x, C.y, 0.095);
  // A pennant softened into a rounded leaf near the ribbon's end.
  const flagAt = ribbon.getPoint(0.55);
  add(pebble(0.045, 0.5), "Champagne_Index", "optical-core", flagAt.x, flagAt.y, flagAt.z + 0.02);
  const pennant = new THREE.Shape();
  pennant.moveTo(0, 0);
  pennant.bezierCurveTo(0.2, 0.02, 0.22, 0.1, 0.02, 0.15);
  pennant.bezierCurveTo(-0.04, 0.1, -0.04, 0.03, 0, 0);
  add(
    relief(pennant, 0.035, 0.02),
    "Amber_Optical_Inlay",
    "optical-core",
    flagAt.x + 0.02,
    flagAt.y + 0.16,
    0.06,
    -0.2,
  );
  return meshes;
}

// ---------------------------------------------------------------- P-004 ----
// FruitAdvisor, organic reading: a lathed apple at the center, wrapped by a
// soft rubber-band frame; a flowing scan arc sweeps over the fruit while a
// smooth pebble camera watches through a curved signal strand.
function buildFruit(mat: MatFactory): ThemeBuild["meshes"] {
  const meshes: THREE.Mesh[] = [];
  const add = (
    geometry: THREE.BufferGeometry,
    material: string,
    part: Part,
    x: number,
    y: number,
    z: number,
    rz = 0,
  ) => {
    const mesh = tag(new THREE.Mesh(geometry, mat(material)), material, part);
    mesh.position.set(x, y, z);
    mesh.rotation.z = rz;
    meshes.push(mesh);
  };

  const ax = C.x - 0.18,
    ay = C.y + 0.02;
  // Lathed apple: dimpled crown, full hips, no straight lines anywhere.
  add(appleForm(0.3, 0.42), "Amber_Optical_Inlay", "optical-core", ax, ay, 0.03);
  // Stem: a short curved tube bending over the dimple.
  const stem = new THREE.CatmullRomCurve3([
    new THREE.Vector3(ax, ay + 0.4, 0.08),
    new THREE.Vector3(ax + 0.04, ay + 0.48, 0.09),
    new THREE.Vector3(ax + 0.1, ay + 0.5, 0.09),
  ]);
  add(
    new THREE.TubeGeometry(stem, 16, 0.018, 8, false),
    "Champagne_Index",
    "optical-core",
    0,
    0,
    0,
  );
  const leafGeo = new THREE.SphereGeometry(0.09, 20, 14);
  leafGeo.scale(1, 0.42, 0.3);
  add(leafGeo, "Champagne_Index", "optical-core", ax + 0.15, ay + 0.47, 0.09);

  // Soft rubber-band frame hugging the apple (rounded rectangle as a tube).
  const fw = 0.92,
    fh = 1.14,
    fr = 0.3;
  const framePts: THREE.Vector3[] = [];
  const arcSteps = 6;
  const corner = (cx: number, cy: number, start: number) => {
    for (let i = 0; i <= arcSteps; i++) {
      const a = start + (i / arcSteps) * (Math.PI / 2);
      framePts.push(new THREE.Vector3(cx + Math.cos(a) * fr, cy + Math.sin(a) * fr, 0.1));
    }
  };
  corner(ax + fw / 2 - fr, ay + fh / 2 - fr, 0);
  corner(ax - fw / 2 + fr, ay + fh / 2 - fr, Math.PI / 2);
  corner(ax - fw / 2 + fr, ay - fh / 2 + fr, Math.PI);
  corner(ax + fw / 2 - fr, ay - fh / 2 + fr, -Math.PI / 2);
  const frameCurve = new THREE.CatmullRomCurve3(framePts, true, "centripetal", 0.8);
  add(
    new THREE.TubeGeometry(frameCurve, 120, 0.024, 10, true),
    "Subsurface_Optics",
    "optical-lenses",
    0,
    0,
    0,
  );
  // Scan arc sweeping over the apple's shoulders.
  const scan = new THREE.CatmullRomCurve3([
    new THREE.Vector3(ax - 0.52, ay - 0.02, 0.11),
    new THREE.Vector3(ax, ay + 0.16, 0.13),
    new THREE.Vector3(ax + 0.52, ay - 0.02, 0.11),
  ]);
  add(
    new THREE.TubeGeometry(scan, 32, 0.028, 10, false),
    "Amber_Optical_Inlay",
    "optical-core",
    0,
    0,
    0,
  );
  // Pebble camera with a soft lens, linked by a curved signal strand.
  const camX = C.x + 0.95,
    camY = C.y - 0.6;
  const camBody = new THREE.SphereGeometry(0.24, 24, 16);
  camBody.scale(1.35, 0.9, 0.42);
  add(camBody, "Optical_Edges", "optical-core", camX, camY, 0.05);
  add(
    new THREE.TorusGeometry(0.11, 0.02, 12, 36),
    "Subsurface_Optics",
    "optical-lenses",
    camX,
    camY,
    0.11,
  );
  add(pebble(0.04, 0.5), "Amber_Optical_Inlay", "optical-core", camX, camY, 0.12);
  const signal = new THREE.CatmullRomCurve3([
    new THREE.Vector3(camX - 0.2, camY + 0.1, 0.08),
    new THREE.Vector3(camX - 0.5, camY + 0.42, 0.1),
    new THREE.Vector3(ax + fw / 2 - 0.04, ay - fh / 2 + 0.06, 0.1),
  ]);
  add(
    new THREE.TubeGeometry(signal, 32, 0.014, 8, false),
    "Champagne_Index",
    "optical-core",
    0,
    0,
    0,
  );
  return meshes;
}

// ---------------------------------------------------------------- I-001 ----
// Hanvon internship, organic reading: a plump amber heart (the hub) breathing
// on a soft ring with six pebble agents, all fed by flowing tendrils; a cloud
// bubble floats on the ring, tethered by one curved signal strand.
function buildAgent(mat: MatFactory): ThemeBuild["meshes"] {
  const meshes: THREE.Mesh[] = [];
  const add = (
    geometry: THREE.BufferGeometry,
    material: string,
    part: Part,
    x: number,
    y: number,
    z: number,
    rz = 0,
  ) => {
    const mesh = tag(new THREE.Mesh(geometry, mat(material)), material, part);
    mesh.position.set(x, y, z);
    mesh.rotation.z = rz;
    meshes.push(mesh);
  };

  const hx = C.x - 0.1,
    hy = C.y - 0.02;
  // Soft shared ring.
  const ringPts: THREE.Vector3[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const wobble = 1 + 0.05 * Math.sin(a * 2);
    ringPts.push(new THREE.Vector3(hx + Math.cos(a) * 1.08 * wobble, hy + Math.sin(a) * 0.76 * wobble, 0.06));
  }
  const ring = new THREE.CatmullRomCurve3(ringPts, true, "centripetal", 0.9);
  add(
    new THREE.TubeGeometry(ring, 120, 0.022, 10, true),
    "Optical_Film",
    "optical-lenses",
    0,
    0,
    0,
  );
  // Hub: a plump amber heart.
  const hubGeo = new THREE.SphereGeometry(0.26, 28, 20);
  hubGeo.scale(1, 1, 0.55);
  add(hubGeo, "Amber_Optical_Inlay", "optical-core", hx, hy, 0.06);
  // Pebble agents on the ring, each fed by a curved tendril from the hub.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const kx = hx + Math.cos(a) * 1.06,
      ky = hy + Math.sin(a) * 0.74;
    const mid = new THREE.Vector3(
      hx + Math.cos(a) * 0.62 + Math.sin(a) * 0.06,
      hy + Math.sin(a) * 0.44 - Math.cos(a) * 0.04,
      0.08,
    );
    const tendril = new THREE.CatmullRomCurve3([
      new THREE.Vector3(hx + Math.cos(a) * 0.2, hy + Math.sin(a) * 0.2, 0.06),
      mid,
      new THREE.Vector3(kx - Math.cos(a) * 0.07, ky - Math.sin(a) * 0.07, 0.07),
    ]);
    add(
      new THREE.TubeGeometry(tendril, 28, 0.016, 8, false),
      "Optical_Film_Edge",
      "optical-core",
      0,
      0,
      0,
    );
    add(
      pebble(0.085, 0.5),
      i % 2 ? "Champagne_Index" : "Subsurface_Optics",
      "optical-core",
      kx,
      ky,
      0.07,
    );
  }
  // Cloud bubble: three merged soft lobes in one beveled silhouette.
  const bx = hx + 1.02,
    by = hy + 0.62;
  const cloud = new THREE.Shape();
  cloud.moveTo(-0.34, -0.1);
  cloud.bezierCurveTo(-0.36, 0.06, -0.24, 0.16, -0.12, 0.14);
  cloud.bezierCurveTo(-0.08, 0.26, 0.1, 0.28, 0.16, 0.16);
  cloud.bezierCurveTo(0.3, 0.16, 0.38, 0.04, 0.32, -0.08);
  cloud.bezierCurveTo(0.3, -0.18, 0.14, -0.2, 0.04, -0.17);
  cloud.lineTo(0.02, -0.28);
  cloud.lineTo(-0.1, -0.17);
  cloud.bezierCurveTo(-0.22, -0.2, -0.33, -0.18, -0.34, -0.1);
  add(relief(cloud, 0.05, 0.03), "Subsurface_Optics", "optical-lenses", bx, by, 0.09);
  for (let i = 0; i < 3; i++) {
    add(pebble(0.035, 0.5), "Amber_Optical_Inlay", "optical-core", bx - 0.13 + i * 0.13, by - 0.02, 0.12);
  }
  // One curved strand feeding the bubble from the nearest agent.
  const strand = new THREE.CatmullRomCurve3([
    new THREE.Vector3(hx + Math.cos(Math.PI / 3) * 1.06, hy + Math.sin(Math.PI / 3) * 0.74, 0.07),
    new THREE.Vector3(bx - 0.32, by - 0.22, 0.1),
    new THREE.Vector3(bx - 0.2, by - 0.06, 0.1),
  ]);
  add(
    new THREE.TubeGeometry(strand, 24, 0.014, 8, false),
    "Champagne_Index",
    "optical-core",
    0,
    0,
    0,
  );
  return meshes;
}

// ------------------------------------------------------------ registry ----
const LABELS: Partial<Record<string, ThemeBuild["labels"]>> = {
  "R-001": {
    lenses: { label: "图谱饰层", en: "ATLAS FILM" },
    core: { label: "网络图谱", en: "NETWORK ATLAS" },
  },
  "P-002": {
    lenses: { label: "航标饰层", en: "MARKER FILM" },
    core: { label: "旅行航标", en: "VOYAGE MARKER" },
  },
  "P-004": {
    lenses: { label: "镜头饰层", en: "LENS FILM" },
    core: { label: "鲜果视界", en: "FRUIT LENS" },
  },
  "I-001": {
    lenses: { label: "矩阵饰层", en: "MATRIX FILM" },
    core: { label: "智能体矩阵", en: "AGENT MATRIX" },
  },
};

const BUILDERS: Partial<Record<string, (mat: MatFactory) => THREE.Mesh[]>> = {
  "R-001": buildNetwork,
  "P-002": buildVoyage,
  "P-004": buildFruit,
  "I-001": buildAgent,
};

export function themeLabels(id: string) {
  return LABELS[id] ?? null;
}

export function buildThemeParts(id: string, mat: MatFactory): ThemeBuild | null {
  const builder = BUILDERS[id];
  const labels = LABELS[id];
  return builder && labels ? { meshes: builder(mat), labels } : null;
}
