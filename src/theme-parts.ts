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

// ---------------------------------------------------------------- R-001 ----
// Forgetting-kernel thesis: a small-world network with one amber kernel.
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

  const nodes: [number, number, number][] = []; // x, y, ring(0=outer,1=inner)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.22;
    const r = 0.86 + (i % 2) * 0.07;
    nodes.push([C.x + Math.cos(a) * r * 1.35, C.y + Math.sin(a) * r * 0.82, 0]);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.65;
    nodes.push([C.x + Math.cos(a) * 0.52, C.y + Math.sin(a) * 0.34, 1]);
  }
  const links: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0],
    [0, 3], [2, 5], [8, 9], [9, 10], [10, 11], [11, 8],
    [8, 1], [9, 3], [10, 5], [11, 7],
  ];
  for (const [a, b] of links) {
    add(
      bar2D(nodes[a][0], nodes[a][1], nodes[b][0], nodes[b][1], 0.02, 0.028),
      "Optical_Film_Edge",
      "optical-core",
      0,
      0,
      0.055,
    );
  }
  nodes.forEach(([x, y, inner], i) => {
    add(
      disc(inner ? 0.055 : 0.065, 0.055),
      i % 3 === 0 ? "Champagne_Index" : "Optical_Edges",
      "optical-core",
      x,
      y,
      0.075,
    );
  });
  // The kernel: one amber node with a halo ring.
  add(disc(0.1, 0.07), "Amber_Optical_Inlay", "optical-core", C.x, C.y, 0.085);
  add(
    new THREE.TorusGeometry(0.18, 0.015, 12, 40),
    "Amber_Optical_Inlay",
    "optical-lenses",
    C.x,
    C.y,
    0.1,
  );
  add(
    relief(frameShape(2.9, 2.0, 0.16, 0.045), 0.03),
    "Optical_Film",
    "optical-lenses",
    C.x,
    C.y,
    0.02,
  );
  return meshes;
}

// ---------------------------------------------------------------- P-002 ----
// Voyager: location pin, dashed route to a flag, and a compass.
function buildVoyage(mat: MatFactory): THREE.Mesh[] {
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

  // Map pin: bulb arc closed into a bottom tip.
  const pin = new THREE.Shape();
  pin.absarc(0, 0.14, 0.28, Math.PI * 0.78, Math.PI * 2.22, false);
  pin.lineTo(0, -0.36);
  pin.closePath();
  const pinX = C.x - 0.78,
    pinY = C.y + 0.12;
  add(relief(pin, 0.06), "Amber_Optical_Inlay", "optical-core", pinX, pinY, 0.05);
  add(disc(0.1, 0.085), "Internal_Ceramic", "optical-core", pinX, pinY + 0.14, 0.08);
  add(
    new THREE.TorusGeometry(0.37, 0.013, 10, 44),
    "Optical_Film",
    "optical-lenses",
    pinX,
    pinY + 0.05,
    0.045,
  );

  // Dashed route from the pin to the flag.
  const route = new THREE.QuadraticBezierCurve(
    new THREE.Vector2(pinX + 0.18, pinY - 0.3),
    new THREE.Vector2(C.x + 0.1, C.y - 1.0),
    new THREE.Vector2(C.x + 0.62, C.y - 0.55),
  );
  for (let i = 0; i < 5; i++) {
    const p = route.getPoint((i + 1) / 6);
    add(disc(0.033, 0.05), "Champagne_Index", "optical-core", p.x, p.y, 0.06);
  }
  // Flag: pole + triangle pennant.
  const flagX = C.x + 0.66,
    flagY = C.y - 0.42;
  add(
    new THREE.BoxGeometry(0.032, 0.36, 0.032),
    "Champagne_Index",
    "optical-core",
    flagX,
    flagY + 0.18,
    0.06,
  );
  const pennant = new THREE.Shape();
  pennant.moveTo(0, 0);
  pennant.lineTo(0.22, 0.075);
  pennant.lineTo(0, 0.15);
  pennant.closePath();
  add(relief(pennant, 0.045), "Amber_Optical_Inlay", "optical-core", flagX + 0.02, flagY + 0.32, 0.055);

  // Compass: champagne ring + amber needle + pivot.
  const comX = C.x + 0.82,
    comY = C.y + 0.55;
  add(
    new THREE.TorusGeometry(0.27, 0.024, 14, 48),
    "Champagne_Index",
    "optical-lenses",
    comX,
    comY,
    0.06,
  );
  add(disc(0.19, 0.03, 32), "Optical_Film", "optical-lenses", comX, comY, 0.045);
  add(
    new THREE.BoxGeometry(0.05, 0.42, 0.035),
    "Amber_Optical_Inlay",
    "optical-core",
    comX,
    comY,
    0.075,
    -0.6,
  );
  add(disc(0.055, 0.06), "Amber_Optical_Inlay", "optical-core", comX, comY, 0.09);
  return meshes;
}

// ---------------------------------------------------------------- P-004 ----
// FruitAdvisor: an apple relief beside a small camera with a bright lens.
function buildFruit(mat: MatFactory): THREE.Mesh[] {
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

  // Apple silhouette with a dimpled crown.
  const apple = new THREE.Shape();
  apple.moveTo(0, -0.3);
  apple.bezierCurveTo(-0.38, -0.36, -0.42, 0.02, -0.28, 0.16);
  apple.bezierCurveTo(-0.18, 0.27, -0.08, 0.25, 0, 0.2);
  apple.bezierCurveTo(0.08, 0.25, 0.18, 0.27, 0.28, 0.16);
  apple.bezierCurveTo(0.42, 0.02, 0.38, -0.36, 0, -0.3);
  const appleX = C.x - 0.6,
    appleY = C.y + 0.1;
  add(relief(apple, 0.06), "Amber_Optical_Inlay", "optical-core", appleX, appleY, 0.05);
  add(
    new THREE.BoxGeometry(0.034, 0.15, 0.034),
    "Champagne_Index",
    "optical-core",
    appleX + 0.02,
    appleY + 0.3,
    0.07,
    0.28,
  );
  const leaf = new THREE.Shape();
  leaf.absellipse(0, 0, 0.13, 0.055, 0, Math.PI * 2);
  add(relief(leaf, 0.035), "Champagne_Index", "optical-core", appleX + 0.14, appleY + 0.34, 0.06, -0.5);

  // Camera: rounded body, film frame, layered lens.
  const camX = C.x + 0.72,
    camY = C.y - 0.42;
  const body = new THREE.Shape();
  body.absarc(0, 0, 0.02, 0, 0); // placeholder replaced below
  const bodyGeo = relief(frameShape(0.78, 0.52, 0.1, 0.055), 0.05);
  add(bodyGeo, "Optical_Edges", "optical-core", camX, camY, 0.05);
  add(
    new THREE.BoxGeometry(0.2, 0.09, 0.05),
    "Optical_Edges",
    "optical-core",
    camX - 0.18,
    camY + 0.3,
    0.05,
  );
  add(new THREE.TorusGeometry(0.15, 0.026, 14, 44), "Subsurface_Optics", "optical-lenses", camX, camY, 0.085);
  add(new THREE.TorusGeometry(0.09, 0.016, 12, 36), "Optical_Film", "optical-lenses", camX, camY, 0.095);
  add(disc(0.055, 0.06), "Amber_Optical_Inlay", "optical-core", camX, camY, 0.1);
  return meshes;
}

// ---------------------------------------------------------------- I-001 ----
// Hanvon internship: one amber hub orchestrating six agents, plus a chat bubble.
function buildAgent(mat: MatFactory): THREE.Mesh[] {
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

  const hubX = C.x - 0.42,
    hubY = C.y - 0.05;
  const hubGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.075, 6);
  hubGeo.rotateX(Math.PI / 2);
  add(hubGeo, "Amber_Optical_Inlay", "optical-core", hubX, hubY, 0.07);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const cx = hubX + Math.cos(a) * 0.62 * 1.25,
      cy = hubY + Math.sin(a) * 0.62 * 0.85;
    add(
      bar2D(
        hubX + Math.cos(a) * 0.27,
        hubY + Math.sin(a) * 0.27 * 0.85,
        cx - Math.cos(a) * 0.1,
        cy - Math.sin(a) * 0.1 * 0.85,
        0.024,
        0.03,
      ),
      "Optical_Film_Edge",
      "optical-core",
      0,
      0,
      0.055,
    );
    add(
      disc(0.088, 0.055),
      i % 2 ? "Champagne_Index" : "Optical_Edges",
      "optical-core",
      cx,
      cy,
      0.075,
    );
  }

  // Chat bubble with a typing indicator.
  const bubbleX = C.x + 0.72,
    bubbleY = C.y + 0.55;
  const bubble = frameShape(0.74, 0.46, 0.1, 0.06);
  bubble.moveTo(-0.2, -0.23);
  bubble.lineTo(-0.3, -0.36);
  bubble.lineTo(-0.06, -0.23);
  const bubbleGeo = relief(bubble, 0.045);
  add(bubbleGeo, "Subsurface_Optics", "optical-lenses", bubbleX, bubbleY, 0.05);
  for (let i = 0; i < 3; i++) {
    add(disc(0.042, 0.05), "Amber_Optical_Inlay", "optical-core", bubbleX - 0.18 + i * 0.18, bubbleY, 0.085);
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
