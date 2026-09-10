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
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

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
// A rounded link between two points: capsule bar with hemispherical caps,
// so no connection in a network ever ends in a flat cut.
function capsule2D(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number,
): THREE.CapsuleGeometry {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const g = new THREE.CapsuleGeometry(radius, Math.max(0.001, length - radius * 2), 4, 10);
  g.rotateZ(Math.PI / 2 - Math.atan2(y2 - y1, x2 - x1));
  g.translate((x1 + x2) / 2, (y1 + y2) / 2, 0);
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
// Forgetting-kernel thesis: a dense node mesh filling the zone — the design
// that already proved readable — with every link as a rounded capsule and the
// amber kernel droplet radiating at the centre.
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

  const outer: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.16;
    outer.push([C.x + Math.cos(a) * 1.3, C.y + Math.sin(a) * 0.88]);
  }
  const inner: [number, number][] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    inner.push([C.x + Math.cos(a) * 0.6, C.y + Math.sin(a) * 0.4]);
  }
  const all = [...outer, ...inner];
  const links: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    links.push([i, (i + 1) % 10]);
    if (i % 2 === 0) links.push([i, (i + 3) % 10]);
  }
  for (let i = 0; i < 4; i++) {
    links.push([10 + i, 10 + ((i + 1) % 4)]);
    links.push([10 + i, (i * 2 + 1) % 10]);
  }
  for (const [a, b] of links) {
    add(
      capsule2D(all[a][0], all[a][1], all[b][0], all[b][1], 0.018),
      "Optical_Film_Edge",
      "optical-core",
      0,
      0,
      0.055,
    );
  }
  outer.forEach(([x, y], i) => {
    add(pebble(0.06, 0.5), i % 3 === 0 ? "Champagne_Index" : "Subsurface_Optics", "optical-core", x, y, 0.07);
  });
  inner.forEach(([x, y]) => {
    add(pebble(0.05, 0.5), "Subsurface_Optics", "optical-core", x, y, 0.07);
  });
  // The kernel: a smooth amber droplet with a soft halo at the mesh's centre.
  add(droplet(0.105, 0.26), "Amber_Optical_Inlay", "optical-core", C.x, C.y, 0.03);
  add(
    new THREE.TorusGeometry(0.19, 0.016, 12, 48),
    "Amber_Optical_Inlay",
    "optical-lenses",
    C.x,
    C.y,
    0.1,
  );
  return meshes;
}

// ---------------------------------------------------------------- P-002 ----
// Voyager as one unmistakable travel object: a plump rounded suitcase with a
// soft handle, two straps and little wheels. Fully rounded, no corners.
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

  const sx = C.x,
    sy = C.y - 0.08;
  // Body: one big soft-edged slab.
  add(
    new RoundedBoxGeometry(1.2, 0.86, 0.3, 5, 0.14),
    "Amber_Optical_Inlay",
    "optical-core",
    sx,
    sy,
    0.05,
  );
  // Two strap bands hugging the body.
  for (const offset of [-0.32, 0.32]) {
    add(
      new RoundedBoxGeometry(0.1, 0.9, 0.32, 4, 0.045),
      "Champagne_Index",
      "optical-lenses",
      sx + offset,
      sy,
      0.06,
    );
  }
  // Soft arc handle rising from the top edge.
  const handle = new THREE.TorusGeometry(0.2, 0.045, 12, 28, Math.PI);
  handle.rotateZ(0);
  add(handle, "Champagne_Index", "optical-lenses", sx, sy + 0.44, 0.07);
  // Two little wheels peeking below the body.
  for (const offset of [-0.38, 0.38]) {
    add(pebble(0.075, 0.6), "Subsurface_Optics", "optical-core", sx + offset, sy - 0.5, 0.07);
  }
  return meshes;
}

// ---------------------------------------------------------------- P-004 ----
// FruitAdvisor: the lathed apple stays — it was already the right read.
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

  const ax = C.x,
    ay = C.y - 0.1;
  add(appleForm(0.46, 0.6), "Amber_Optical_Inlay", "optical-core", ax, ay, 0.03);
  const stem = new THREE.CatmullRomCurve3([
    new THREE.Vector3(ax, ay + 0.55, 0.08),
    new THREE.Vector3(ax + 0.05, ay + 0.66, 0.09),
    new THREE.Vector3(ax + 0.13, ay + 0.68, 0.09),
  ]);
  add(
    new THREE.TubeGeometry(stem, 18, 0.026, 8, false),
    "Champagne_Index",
    "optical-lenses",
    0,
    0,
    0,
  );
  const leafGeo = new THREE.SphereGeometry(0.13, 20, 14);
  leafGeo.scale(1, 0.42, 0.3);
  add(leafGeo, "Champagne_Index", "optical-lenses", ax + 0.2, ay + 0.63, 0.09);
  return meshes;
}

// ---------------------------------------------------------------- I-001 ----
// Hanvon internship: the agent matrix — a plump amber hub feeding six pebble
// agents through rounded tendrils, plus a few capsule cross-links. This is
// the Agent orchestration itself, drawn as one connected organism.
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

  const hx = C.x,
    hy = C.y;
  // Hub: a plump amber heart.
  const hubGeo = new THREE.SphereGeometry(0.27, 28, 20);
  hubGeo.scale(1, 1, 0.55);
  add(hubGeo, "Amber_Optical_Inlay", "optical-core", hx, hy, 0.06);

  const kids: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    kids.push([hx + Math.cos(a) * 1.16, hy + Math.sin(a) * 0.8]);
  }
  kids.forEach(([kx, ky], i) => {
    // Rounded tendril from the hub's edge straight into each pebble.
    const ux = Math.cos((i / 6) * Math.PI * 2 + Math.PI / 6),
      uy = Math.sin((i / 6) * Math.PI * 2 + Math.PI / 6);
    add(
      capsule2D(hx + ux * 0.2, hy + uy * 0.2, kx - ux * 0.07, ky - uy * 0.07, 0.02),
      "Optical_Film_Edge",
      "optical-core",
      0,
      0,
      0.055,
    );
    add(
      pebble(0.085, 0.5),
      i % 2 ? "Champagne_Index" : "Subsurface_Optics",
      "optical-core",
      kx,
      ky,
      0.07,
    );
  });
  // A few capsule cross-links so the ring reads as one team.
  for (const [a, b] of [[0, 2], [2, 4], [4, 0]] as const) {
    add(
      capsule2D(kids[a][0], kids[a][1], kids[b][0], kids[b][1], 0.014),
      "Optical_Film_Edge",
      "optical-core",
      0,
      0,
      0.045,
    );
  }
  // Soft halo ring circling the hub.
  add(
    new THREE.TorusGeometry(0.38, 0.016, 12, 48),
    "Champagne_Index",
    "optical-lenses",
    hx,
    hy,
    0.1,
  );
  return meshes;
}

// ------------------------------------------------------------ registry ----
const LABELS: Partial<Record<string, ThemeBuild["labels"]>> = {
  "R-001": {
    lenses: { label: "内核光晕", en: "KERNEL HALO" },
    core: { label: "网络图谱", en: "NETWORK ATLAS" },
  },
  "P-002": {
    lenses: { label: "提手与饰带", en: "HANDLE & STRAPS" },
    core: { label: "旅行箱", en: "SUITCASE" },
  },
  "P-004": {
    lenses: { label: "梗与叶", en: "STEM & LEAF" },
    core: { label: "苹果", en: "APPLE" },
  },
  "I-001": {
    lenses: { label: "矩阵光环", en: "MATRIX HALO" },
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
