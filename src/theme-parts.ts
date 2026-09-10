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
// Forgetting-kernel thesis as ONE icon: a soft brain silhouette with the
// small amber kernel nested at its centre — the thesis's own metaphor.
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

  // Brain: two crown lobes flowing into a tapered stem, one continuous outline.
  const brain = new THREE.Shape();
  brain.moveTo(0, -0.42);
  brain.bezierCurveTo(-0.52, -0.4, -0.64, -0.06, -0.53, 0.12);
  brain.bezierCurveTo(-0.6, 0.32, -0.42, 0.46, -0.25, 0.43);
  brain.bezierCurveTo(-0.14, 0.52, -0.04, 0.47, 0, 0.4);
  brain.bezierCurveTo(0.04, 0.47, 0.14, 0.52, 0.25, 0.43);
  brain.bezierCurveTo(0.42, 0.46, 0.6, 0.32, 0.53, 0.12);
  brain.bezierCurveTo(0.64, -0.06, 0.52, -0.4, 0, -0.42);
  add(
    relief(brain, 0.07, 0.045),
    "Subsurface_Optics",
    "optical-core",
    C.x,
    C.y + 0.02,
    0.04,
  );
  // The kernel: a small amber droplet resting in the brain's crown valley.
  add(droplet(0.085, 0.2), "Amber_Optical_Inlay", "optical-lenses", C.x, C.y - 0.02, 0.1);
  return meshes;
}

// ---------------------------------------------------------------- P-002 ----
// Voyager as ONE icon: a plump location pin, nothing else.
function buildVoyage(mat: MatFactory): ThemeBuild["meshes"] {
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

  const pin = new THREE.Shape();
  pin.absarc(0, 0.22, 0.44, Math.PI * 0.78, Math.PI * 2.22, false);
  pin.lineTo(0, -0.56);
  pin.closePath();
  add(relief(pin, 0.08, 0.045), "Amber_Optical_Inlay", "optical-core", C.x, C.y - 0.02, 0.04);
  // The pin's inset, a calm ivory dot.
  add(pebble(0.15, 0.55), "Internal_Ceramic", "optical-lenses", C.x, C.y + 0.2, 0.12);
  return meshes;
}

// ---------------------------------------------------------------- P-004 ----
// FruitAdvisor as ONE icon: a lathed apple with its stem and leaf, nothing else.
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
// Hanvon internship as ONE icon: a soft chat bubble mid-typing, nothing else.
function buildAgent(mat: MatFactory): ThemeBuild["meshes"] {
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

  // Rounded bubble slab with a soft tail tucked underneath.
  const bubble = new THREE.Shape();
  const w = 1.34,
    h = 0.92,
    r = 0.26;
  const x = -w / 2,
    y = -h / 2;
  bubble.moveTo(x + r, y);
  bubble.lineTo(x + w - r, y);
  bubble.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  bubble.lineTo(x + w, y + h - r);
  bubble.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  bubble.lineTo(x + w * 0.44, y + h);
  bubble.lineTo(x + w * 0.3, y + h - 0.26);
  bubble.lineTo(x + r, y + h);
  bubble.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  bubble.lineTo(x, y + r);
  bubble.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  add(
    relief(bubble, 0.07, 0.04),
    "Subsurface_Optics",
    "optical-core",
    C.x,
    C.y + 0.1,
    0.04,
  );
  for (let i = 0; i < 3; i++) {
    add(pebble(0.075, 0.55), "Amber_Optical_Inlay", "optical-lenses", C.x - 0.26 + i * 0.26, C.y + 0.16, 0.12);
  }
  return meshes;
}

// ------------------------------------------------------------ registry ----
const LABELS: Partial<Record<string, ThemeBuild["labels"]>> = {
  "R-001": {
    lenses: { label: "遗忘内核", en: "FORGETTING KERNEL" },
    core: { label: "大脑剪影", en: "BRAIN FORM" },
  },
  "P-002": {
    lenses: { label: "钉孔嵌珠", en: "PIN INSET" },
    core: { label: "定位钉", en: "MAP PIN" },
  },
  "P-004": {
    lenses: { label: "梗与叶", en: "STEM & LEAF" },
    core: { label: "苹果", en: "APPLE" },
  },
  "I-001": {
    lenses: { label: "输入中", en: "TYPING" },
    core: { label: "对话气泡", en: "CHAT BUBBLE" },
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
