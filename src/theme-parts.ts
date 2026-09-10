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
// Forgetting-kernel thesis: one orbit ring binding a dense node mesh into a
// single constructivist composition, with the amber kernel at its centre.
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

  // The orbit all nodes live on — the compositional spine.
  add(relief(orbitShape(1.42, 0.98, 0.03), 0.024), "Optical_Film", "optical-lenses", C.x, C.y, 0.1);
  add(new THREE.TorusGeometry(0.2, 0.016, 12, 44), "Amber_Optical_Inlay", "optical-lenses", C.x, C.y, 0.115);

  const nodes: [number, number][] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.12;
    nodes.push([C.x + Math.cos(a) * 1.42, C.y + Math.sin(a) * 0.98]);
  }
  const inner: [number, number][] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    inner.push([C.x + Math.cos(a) * 0.58, C.y + Math.sin(a) * 0.4]);
  }
  const links: [number, number][] = [];
  for (let i = 0; i < 12; i++) {
    links.push([i, (i + 1) % 12]);
    if (i % 3 === 0) links.push([i, (i + 3) % 12]);
    if (i % 2 === 0) links.push([i, (i + 5) % 12]);
  }
  for (let i = 0; i < 4; i++) {
    links.push([12 + i, 12 + ((i + 1) % 4)]);
    links.push([12 + i, (i * 3 + 1) % 12]);
  }
  const all = [...nodes, ...inner];
  for (const [a, b] of links) {
    add(
      bar2D(all[a][0], all[a][1], all[b][0], all[b][1], 0.017, 0.024),
      "Optical_Film_Edge",
      "optical-core",
      0,
      0,
      0.05,
    );
  }
  nodes.forEach(([x, y], i) => {
    add(disc(0.052, 0.05), i % 3 === 0 ? "Champagne_Index" : "Optical_Edges", "optical-core", x, y, 0.065);
  });
  inner.forEach(([x, y]) => {
    add(disc(0.044, 0.05), "Optical_Edges", "optical-core", x, y, 0.065);
  });
  // Kernel + starburst: the forgetting kernel radiating into the mesh.
  for (const geo of starburstBars(C.x, C.y, 0.14, 0.36, 0.022, 0.028)) {
    add(geo, "Amber_Optical_Inlay", "optical-core", 0, 0, 0.055);
  }
  add(disc(0.105, 0.06), "Amber_Optical_Inlay", "optical-core", C.x, C.y, 0.08);
  return meshes;
}

// ---------------------------------------------------------------- P-002 ----
// Voyager: pin, route and flag ride one big planet ring; a compass rose sits
// at its centre. Every element is anchored to the same circle.
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

  const cx = C.x + 0.22,
    cy = C.y + 0.02,
    R = 0.98;
  // Planet ring the whole journey rides on.
  add(relief(orbitShape(R, R, 0.026), 0.024), "Optical_Film", "optical-lenses", cx, cy, 0.1);

  const deg = (d: number) => (d * Math.PI) / 180;
  const onRing = (d: number): [number, number] => [
    cx + Math.cos(deg(d)) * R,
    cy + Math.sin(deg(d)) * R,
  ];
  // Pin planted on the ring, tilted outward like a marker on a map.
  const pin = new THREE.Shape();
  pin.absarc(0, 0.13, 0.24, Math.PI * 0.78, Math.PI * 2.22, false);
  pin.lineTo(0, -0.33);
  pin.closePath();
  const [px, py] = onRing(148);
  add(relief(pin, 0.055), "Amber_Optical_Inlay", "optical-core", px, py, 0.055, -0.35);
  add(disc(0.085, 0.07), "Internal_Ceramic", "optical-core", px, py + 0.1, 0.085);
  // Route: a bright arc of the ring itself, dotted, ending at the flag.
  add(relief(arcBandShape(R, 0.036, deg(20), deg(138)), 0.03), "Amber_Optical_Inlay", "optical-core", cx, cy, 0.045);
  for (const [dx, dy] of [
    onRing(126), onRing(108), onRing(90), onRing(72), onRing(54), onRing(36),
  ] as [number, number][]) {
    add(disc(0.034, 0.05), "Champagne_Index", "optical-core", dx, dy, 0.075);
  }
  // Flag at the arc's end, pennant flying outward.
  const [fx, fy] = onRing(20);
  add(new THREE.BoxGeometry(0.032, 0.34, 0.032), "Champagne_Index", "optical-core", fx, fy + 0.14, 0.065);
  const pennant = new THREE.Shape();
  pennant.moveTo(0, 0);
  pennant.lineTo(0.2, 0.07);
  pennant.lineTo(0, 0.14);
  pennant.closePath();
  add(relief(pennant, 0.04), "Amber_Optical_Inlay", "optical-core", fx + 0.02, fy + 0.26, 0.06);
  // Compass rose at the planet's centre.
  add(new THREE.TorusGeometry(0.23, 0.02, 12, 44), "Champagne_Index", "optical-lenses", cx, cy, 0.11);
  for (const geo of starburstBars(cx, cy, 0.05, 0.3, 0.024, 0.03)) {
    add(geo, "Amber_Optical_Inlay", "optical-core", 0, 0, 0.07);
  }
  add(disc(0.05, 0.055), "Amber_Optical_Inlay", "optical-core", cx, cy, 0.085);
  return meshes;
}

// ---------------------------------------------------------------- P-004 ----
// FruitAdvisor: the camera frames the apple — viewfinder brackets close in on
// the fruit while a scan line sweeps across it. Camera and subject interact.
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

  const ax = C.x - 0.22,
    ay = C.y + 0.06;
  // Apple with crown dimple, stem and leaf.
  const apple = new THREE.Shape();
  apple.moveTo(0, -0.36);
  apple.bezierCurveTo(-0.46, -0.42, -0.5, 0.02, -0.33, 0.19);
  apple.bezierCurveTo(-0.21, 0.32, -0.09, 0.3, 0, 0.24);
  apple.bezierCurveTo(0.09, 0.3, 0.21, 0.32, 0.33, 0.19);
  apple.bezierCurveTo(0.5, 0.02, 0.46, -0.42, 0, -0.36);
  add(relief(apple, 0.055), "Amber_Optical_Inlay", "optical-core", ax, ay, 0.05);
  add(new THREE.BoxGeometry(0.036, 0.17, 0.036), "Champagne_Index", "optical-core", ax + 0.02, ay + 0.37, 0.07, 0.28);
  const leaf = new THREE.Shape();
  leaf.absellipse(0, 0, 0.15, 0.06, 0, Math.PI * 2);
  add(relief(leaf, 0.035), "Champagne_Index", "optical-core", ax + 0.16, ay + 0.41, 0.06, -0.5);

  // Viewfinder brackets closing in on the apple (camera ↔ subject).
  const bw = 0.74,
    bh = 0.98,
    arm = 0.2,
    t = 0.032;
  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  for (const [sx, sy] of corners) {
    const bx = ax + sx * bw * 0.5,
      by = ay + sy * bh * 0.5;
    add(new THREE.BoxGeometry(arm, t, 0.034), "Subsurface_Optics", "optical-lenses", bx - sx * arm * 0.5, by, 0.105);
    add(new THREE.BoxGeometry(t, arm, 0.034), "Subsurface_Optics", "optical-lenses", bx, by - sy * arm * 0.5, 0.105);
  }
  // Scan line sweeping across the fruit.
  add(new THREE.BoxGeometry(1.06, 0.045, 0.03), "Amber_Optical_Inlay", "optical-core", ax, ay + 0.06, 0.095);

  // Camera tucked at the bracket's lower-right, linked by a dotted signal.
  const camX = C.x + 0.98,
    camY = C.y - 0.62;
  add(relief(frameShape(0.74, 0.5, 0.1, 0.055), 0.05), "Optical_Edges", "optical-core", camX, camY, 0.05);
  add(new THREE.TorusGeometry(0.14, 0.024, 14, 40), "Subsurface_Optics", "optical-lenses", camX, camY, 0.085);
  add(disc(0.05, 0.055), "Amber_Optical_Inlay", "optical-core", camX, camY, 0.095);
  for (const [dx, dy] of curveDots([camX - 0.2, camY + 0.16], [camX - 0.5, camY + 0.4], [ax + 0.44, ay - 0.3], 3)) {
    add(disc(0.026, 0.045), "Champagne_Index", "optical-core", dx, dy, 0.07);
  }
  return meshes;
}

// ---------------------------------------------------------------- I-001 ----
// Hanvon internship: an amber hub on one shared orbit with six agents, and a
// chat bubble on the same orbit listening in through a dotted signal.
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

  const hx = C.x - 0.18,
    hy = C.y - 0.04,
    rx = 1.12,
    ry = 0.8;
  // One orbit the whole crew shares.
  add(relief(orbitShape(rx, ry, 0.024), 0.022), "Optical_Film", "optical-lenses", hx, hy, 0.1);

  const hubGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.075, 6);
  hubGeo.rotateX(Math.PI / 2);
  add(hubGeo, "Amber_Optical_Inlay", "optical-core", hx, hy, 0.07);

  const kids: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    kids.push([hx + Math.cos(a) * rx, hy + Math.sin(a) * ry]);
  }
  kids.forEach(([kx, ky], i) => {
    add(
      bar2D(hx, hy, kx, ky, 0.022, 0.026),
      "Optical_Film_Edge",
      "optical-core",
      0,
      0,
      0.05,
    );
    add(disc(0.082, 0.055), i % 2 ? "Champagne_Index" : "Optical_Edges", "optical-core", kx, ky, 0.07);
  });

  // Chat bubble on the orbit, listening through a dotted signal line.
  const bubbleAngle = Math.PI / 3.1;
  const bx = hx + Math.cos(bubbleAngle) * rx,
    by = hy + Math.sin(bubbleAngle) * ry;
  const bubble = frameShape(0.62, 0.4, 0.09, 0.055);
  bubble.moveTo(-0.16, -0.2);
  bubble.lineTo(-0.26, -0.32);
  bubble.lineTo(-0.04, -0.2);
  add(relief(bubble, 0.045), "Subsurface_Optics", "optical-lenses", bx, by, 0.105);
  for (let i = 0; i < 3; i++) {
    add(disc(0.04, 0.05), "Amber_Optical_Inlay", "optical-core", bx - 0.15 + i * 0.15, by, 0.08);
  }
  const talker = kids[2];
  for (const [dx, dy] of curveDots([talker[0], talker[1]], [(talker[0] + bx) / 2, (talker[1] + by) / 2 + 0.18], [bx - 0.3, by - 0.06], 3)) {
    add(disc(0.026, 0.045), "Champagne_Index", "optical-core", dx, dy, 0.07);
  }
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
