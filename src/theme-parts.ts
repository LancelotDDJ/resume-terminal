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

// Solid rounded rectangle (filled, unlike frameShape's outline).
function roundRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2,
    y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return s;
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
  g.scale(1, 1, 0.6);
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
  add(droplet(0.105, 0.19), "Amber_Optical_Inlay", "optical-core", C.x, C.y, 0.03);
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
    new RoundedBoxGeometry(1.2, 0.86, 0.2, 5, 0.14),
    "Amber_Optical_Inlay",
    "optical-core",
    sx,
    sy,
    0.075,
  );
  // Two strap bands hugging the body.
  for (const offset of [-0.32, 0.32]) {
    add(
      new RoundedBoxGeometry(0.1, 0.9, 0.2, 4, 0.045),
      "Champagne_Index",
      "optical-lenses",
      sx + offset,
      sy,
      0.075,
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
  add(appleForm(0.46, 0.34), "Amber_Optical_Inlay", "optical-core", ax, ay, 0.03);
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
  hubGeo.scale(1, 1, 0.42);
  add(hubGeo, "Amber_Optical_Inlay", "optical-core", hx, hy, 0.09);

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

// ---------------------------------------------------------------- O-001 ----
// About the person: a rounded bust with a quiet halo. Instantly "profile".
function buildPersona(mat: MatFactory): THREE.Mesh[] {
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
  const bust = new THREE.Shape();
  bust.moveTo(-0.64, -0.52);
  bust.bezierCurveTo(-0.62, -0.1, -0.32, 0.14, 0, 0.14);
  bust.bezierCurveTo(0.32, 0.14, 0.62, -0.1, 0.64, -0.52);
  bust.closePath();
  add(relief(bust, 0.09, 0.045), "Amber_Optical_Inlay", "optical-core", C.x, C.y - 0.22, 0.04);
  const headGeo = new THREE.SphereGeometry(0.27, 26, 18);
  headGeo.scale(1, 1, 0.42);
  add(headGeo, "Amber_Optical_Inlay", "optical-core", C.x, C.y + 0.36, 0.09);
  add(
    new THREE.TorusGeometry(0.36, 0.02, 12, 48),
    "Champagne_Index",
    "optical-lenses",
    C.x,
    C.y + 0.42,
    0.045,
  );
  return meshes;
}

// ---------------------------------------------------------------- O-002 ----
// Self assessment: a soft four-point star — the personal spark, fully rounded.
function buildStar(mat: MatFactory): THREE.Mesh[] {
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
  const star = new THREE.Shape();
  star.moveTo(0, 0.56);
  star.quadraticCurveTo(0.1, 0.14, 0.56, 0);
  star.quadraticCurveTo(0.14, -0.1, 0, -0.56);
  star.quadraticCurveTo(-0.1, -0.14, -0.56, 0);
  star.quadraticCurveTo(-0.14, 0.1, 0, 0.56);
  add(relief(star, 0.09, 0.05), "Amber_Optical_Inlay", "optical-core", C.x, C.y, 0.04);
  add(pebble(0.1, 0.55), "Champagne_Index", "optical-lenses", C.x, C.y, 0.13);
  return meshes;
}

// ---------------------------------------------------------------- O-003 ----
// About this site: a rounded document page with a folded corner and a calm
// info mark. Reads as "the fine print about this archive".
function buildDocPage(mat: MatFactory): THREE.Mesh[] {
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
  const page = roundRectShape(0.95, 1.2, 0.1);
  add(relief(page, 0.06, 0.03), "Subsurface_Optics", "optical-core", C.x, C.y - 0.04, 0.04);
  // Folded corner: a small rounded flap at the top right.
  const flap = new THREE.Shape();
  flap.moveTo(0, 0);
  flap.quadraticCurveTo(0.16, -0.02, 0.18, -0.16);
  flap.quadraticCurveTo(0.02, -0.14, 0, 0);
  add(relief(flap, 0.05, 0.02), "Champagne_Index", "optical-core", C.x + 0.28, C.y + 0.56, 0.08);
  // Info mark: a dot and a capsule stem, both softly rounded.
  add(pebble(0.055, 0.55), "Amber_Optical_Inlay", "optical-lenses", C.x, C.y + 0.24, 0.1);
  add(
    new THREE.CapsuleGeometry(0.05, 0.26, 6, 10),
    "Amber_Optical_Inlay",
    "optical-lenses",
    C.x,
    C.y - 0.14,
    0.1,
  );
  return meshes;
}

// ---------------------------------------------------------------- E-001 ----
// Masters at Adelaide: the mortarboard — soft square board, domed crown and a
// curved tassel with a droplet tip.
function buildMortarboard(mat: MatFactory): THREE.Mesh[] {
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
  const domeGeo = new THREE.SphereGeometry(0.3, 26, 18);
  domeGeo.scale(1, 1, 0.4);
  add(domeGeo, "Champagne_Index", "optical-core", C.x, C.y - 0.04, 0.09);
  add(
    new RoundedBoxGeometry(1.16, 0.78, 0.12, 5, 0.06),
    "Amber_Optical_Inlay",
    "optical-core",
    C.x,
    C.y + 0.14,
    0.06,
    -0.06,
  );
  add(disc(0.06, 0.04), "Champagne_Index", "optical-core", C.x, C.y + 0.23, 0.06);
  // Tassel: a curved thread arcing off the board's right corner.
  const tassel = new THREE.CatmullRomCurve3([
    new THREE.Vector3(C.x + 0.52, C.y + 0.12, 0.08),
    new THREE.Vector3(C.x + 0.62, C.y - 0.14, 0.08),
    new THREE.Vector3(C.x + 0.6, C.y - 0.4, 0.08),
  ]);
  add(
    new THREE.TubeGeometry(tassel, 20, 0.022, 8, false),
    "Champagne_Index",
    "optical-lenses",
    0,
    0,
    0,
  );
  add(droplet(0.05, 0.12), "Champagne_Index", "optical-lenses", C.x + 0.6, C.y - 0.52, 0.05);
  return meshes;
}

// ---------------------------------------------------------------- E-002 ----
// IoT engineering undergrad: a plump chip with soft pins on all four sides and
// an amber core dot. Reads hardware at a glance.
function buildChip(mat: MatFactory): THREE.Mesh[] {
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
  add(
    new RoundedBoxGeometry(0.92, 0.92, 0.18, 5, 0.1),
    "Subsurface_Optics",
    "optical-core",
    C.x,
    C.y,
    0.07,
  );
  // Soft pins: four per side, capsules reaching outward.
  for (let side = 0; side < 4; side++) {
    const a = (side * Math.PI) / 2;
    const dx = Math.cos(a),
      dy = Math.sin(a);
    for (const offset of [-0.26, 0, 0.26]) {
      const px = C.x + dx * 0.56 - dy * offset,
        py = C.y + dy * 0.56 + dx * offset;
      add(
        new THREE.CapsuleGeometry(0.04, 0.12, 4, 8),
        "Champagne_Index",
        "optical-core",
        px,
        py,
        0.05,
        a + Math.PI / 2,
      );
    }
  }
  add(pebble(0.15, 0.55), "Amber_Optical_Inlay", "optical-lenses", C.x, C.y, 0.12);
  return meshes;
}

// ---------------------------------------------------------------- P-001 ----
// This very site: a soft terminal screen on a little stand with one glowing
// cursor bar. The archive terminal itself, miniaturised.
function buildTerminal(mat: MatFactory): THREE.Mesh[] {
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
  add(
    new RoundedBoxGeometry(1.32, 0.86, 0.12, 5, 0.08),
    "Amber_Optical_Inlay",
    "optical-core",
    C.x,
    C.y + 0.14,
    0.05,
  );
  add(
    new RoundedBoxGeometry(0.16, 0.2, 0.09, 4, 0.04),
    "Champagne_Index",
    "optical-core",
    C.x,
    C.y - 0.38,
    0.05,
  );
  add(pebble(0.16, 0.4), "Champagne_Index", "optical-core", C.x, C.y - 0.5, 0.05);
  // The single glowing cursor on the screen.
  add(
    new RoundedBoxGeometry(0.26, 0.07, 0.045, 4, 0.03),
    "Internal_Ceramic",
    "optical-lenses",
    C.x - 0.36,
    C.y + 0.18,
    0.13,
  );
  return meshes;
}

// ---------------------------------------------------------------- P-003 ----
// Coupang analysis: the magnifier — champagne ring, translucent lens and a
// capsule handle, with a tiny amber find resting in the glass.
function buildMagnifier(mat: MatFactory): THREE.Mesh[] {
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
  const lx = C.x - 0.12,
    ly = C.y + 0.14;
  add(
    new THREE.TorusGeometry(0.36, 0.05, 14, 48),
    "Champagne_Index",
    "optical-core",
    lx,
    ly,
    0.08,
  );
  const glass = new THREE.SphereGeometry(0.3, 26, 18);
  glass.scale(1, 1, 0.25);
  add(glass, "Subsurface_Optics", "optical-lenses", lx, ly, 0.07);
  add(pebble(0.08, 0.5), "Amber_Optical_Inlay", "optical-lenses", lx, ly, 0.11);
  // Capsule handle angling down-right from the ring.
  add(
    capsule2D(lx + 0.24, ly - 0.24, lx + 0.62, ly - 0.66, 0.055),
    "Amber_Optical_Inlay",
    "optical-core",
    0,
    0,
    0.07,
  );
  return meshes;
}

// ---------------------------------------------------------------- P-005 ----
// IoT farm: a seedling — two soft leaves on a curved stem rising from a soil
// mound. Agriculture in one rounded read.
function buildSeedling(mat: MatFactory): THREE.Mesh[] {
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
  const moundGeo = new THREE.SphereGeometry(0.52, 28, 18);
  moundGeo.scale(1, 0.45, 0.18);
  add(moundGeo, "Champagne_Index", "optical-core", C.x, C.y - 0.56, 0.07);
  const stem = new THREE.CatmullRomCurve3([
    new THREE.Vector3(C.x, C.y - 0.5, 0.06),
    new THREE.Vector3(C.x - 0.04, C.y - 0.1, 0.08),
    new THREE.Vector3(C.x + 0.02, C.y + 0.3, 0.08),
  ]);
  add(
    new THREE.TubeGeometry(stem, 24, 0.038, 10, false),
    "Amber_Optical_Inlay",
    "optical-core",
    0,
    0,
    0,
  );
  // Two plump leaves opening at the stem's tip.
  for (const side of [-1, 1]) {
    const leafGeo = new THREE.SphereGeometry(0.19, 20, 14);
    leafGeo.scale(1, 0.4, 0.32);
    add(
      leafGeo,
      "Amber_Optical_Inlay",
      "optical-lenses",
      C.x + side * 0.22,
      C.y + 0.42,
      0.09,
      side * 0.55,
    );
  }
  return meshes;
}

// ---------------------------------------------------------------- P-006 ----
// AI chat app: a friendly bot head — plump rounded face, two amber eyes and a
// curved antenna with a droplet tip.
function buildBot(mat: MatFactory): THREE.Mesh[] {
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
  add(
    new RoundedBoxGeometry(0.98, 0.84, 0.2, 6, 0.18),
    "Subsurface_Optics",
    "optical-core",
    C.x,
    C.y - 0.06,
    0.075,
  );
  for (const side of [-1, 1]) {
    add(pebble(0.095, 0.5), "Amber_Optical_Inlay", "optical-lenses", C.x + side * 0.21, C.y + 0.02, 0.16);
  }
  const antenna = new THREE.CatmullRomCurve3([
    new THREE.Vector3(C.x, C.y + 0.36, 0.08),
    new THREE.Vector3(C.x + 0.04, C.y + 0.5, 0.09),
    new THREE.Vector3(C.x + 0.1, C.y + 0.56, 0.09),
  ]);
  add(
    new THREE.TubeGeometry(antenna, 16, 0.024, 8, false),
    "Champagne_Index",
    "optical-lenses",
    0,
    0,
    0,
  );
  add(pebble(0.06, 0.55), "Amber_Optical_Inlay", "optical-lenses", C.x + 0.1, C.y + 0.6, 0.09);
  return meshes;
}

// ---------------------------------------------------------------- R-002 ----
// Blood-cell study: the biconcave red cell from the textbooks, lathed with a
// dimpled centre, plus one smaller companion cell.
function buildBloodCell(mat: MatFactory): THREE.Mesh[] {
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
  // Biconcave profile: thin dimpled centre rising to a plump rim.
  const pts = [
    new THREE.Vector2(0, 0.03),
    new THREE.Vector2(0.14, 0.024),
    new THREE.Vector2(0.28, 0.04),
    new THREE.Vector2(0.42, 0.1),
    new THREE.Vector2(0.46, 0.16),
    new THREE.Vector2(0.42, 0.21),
    new THREE.Vector2(0.28, 0.25),
    new THREE.Vector2(0.14, 0.26),
    new THREE.Vector2(0, 0.22),
  ];
  const cellGeo = new THREE.LatheGeometry(pts, 36);
  cellGeo.rotateX(Math.PI / 2);
  cellGeo.scale(1.35, 1.35, 0.7);
  add(cellGeo, "Amber_Optical_Inlay", "optical-core", C.x, C.y, 0.04, 0.2);
  const smallGeo = cellGeo.clone();
  smallGeo.scale(0.62, 0.62, 0.7);
  add(smallGeo, "Champagne_Index", "optical-lenses", C.x + 0.72, C.y + 0.42, 0.07, -0.3);
  return meshes;
}

// ---------------------------------------------------------------- S-001 ----
// Skills: two rounded gears meshing — one amber, one champagne, teeth as
// smooth capsules so nothing is ever sharp.
function gearMesh(
  mat: MatFactory,
  radius: number,
  teeth: number,
  depth: number,
  material: string,
  part: Part,
  x: number,
  y: number,
  z: number,
): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  const bodyGeo = new THREE.CylinderGeometry(radius, radius, depth, 32);
  bodyGeo.rotateX(Math.PI / 2);
  out.push(tag(new THREE.Mesh(bodyGeo, mat(material)), material, part));
  out[0].position.set(x, y, z);
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const tx = x + Math.cos(a) * (radius + 0.045),
      ty = y + Math.sin(a) * (radius + 0.045);
    const tooth = new THREE.CapsuleGeometry(0.05, 0.09, 4, 8);
    tooth.rotateZ(a + Math.PI / 2);
    const mesh = tag(new THREE.Mesh(tooth, mat(material)), material, part);
    mesh.position.set(tx, ty, z);
    out.push(mesh);
  }
  const hubGeo = new THREE.CylinderGeometry(radius * 0.3, radius * 0.3, depth + 0.03, 20);
  hubGeo.rotateX(Math.PI / 2);
  const hub = tag(new THREE.Mesh(hubGeo, mat(material)), material, part);
  hub.position.set(x, y, z + 0.01);
  out.push(hub);
  return out;
}
function buildGears(mat: MatFactory): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  meshes.push(
    ...gearMesh(mat, 0.34, 10, 0.09, "Amber_Optical_Inlay", "optical-core", C.x - 0.18, C.y - 0.08, 0.05),
  );
  meshes.push(
    ...gearMesh(mat, 0.22, 8, 0.08, "Champagne_Index", "optical-lenses", C.x + 0.42, C.y + 0.3, 0.09),
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
  "O-001": {
    lenses: { label: "光环", en: "HALO" },
    core: { label: "人像", en: "PERSONA" },
  },
  "O-002": {
    lenses: { label: "星心", en: "STAR CORE" },
    core: { label: "星芒", en: "STARLIGHT" },
  },
  "O-003": {
    lenses: { label: "信息符", en: "INFO MARK" },
    core: { label: "文档页", en: "DOC PAGE" },
  },
  "E-001": {
    lenses: { label: "流苏", en: "TASSEL" },
    core: { label: "学位帽", en: "MORTARBOARD" },
  },
  "E-002": {
    lenses: { label: "核心点", en: "CORE DOT" },
    core: { label: "芯片", en: "CHIP" },
  },
  "P-001": {
    lenses: { label: "光标", en: "CURSOR" },
    core: { label: "终端屏", en: "TERMINAL" },
  },
  "P-003": {
    lenses: { label: "镜片", en: "LENS GLASS" },
    core: { label: "放大镜", en: "MAGNIFIER" },
  },
  "P-005": {
    lenses: { label: "新叶", en: "LEAVES" },
    core: { label: "幼苗", en: "SEEDLING" },
  },
  "P-006": {
    lenses: { label: "目与天线", en: "EYES & ANTENNA" },
    core: { label: "机器人", en: "BOT" },
  },
  "R-002": {
    lenses: { label: "伴胞", en: "COMPANION CELL" },
    core: { label: "红细胞", en: "BLOOD CELL" },
  },
  "S-001": {
    lenses: { label: "副轮", en: "PINION" },
    core: { label: "齿轮", en: "GEAR" },
  },
};

const BUILDERS: Partial<Record<string, (mat: MatFactory) => THREE.Mesh[]>> = {
  "R-001": buildNetwork,
  "P-002": buildVoyage,
  "P-004": buildFruit,
  "I-001": buildAgent,
  "O-001": buildPersona,
  "O-002": buildStar,
  "O-003": buildDocPage,
  "E-001": buildMortarboard,
  "E-002": buildChip,
  "P-001": buildTerminal,
  "P-003": buildMagnifier,
  "P-005": buildSeedling,
  "P-006": buildBot,
  "R-002": buildBloodCell,
  "S-001": buildGears,
};

export function themeLabels(id: string) {
  return LABELS[id] ?? null;
}

export function buildThemeParts(id: string, mat: MatFactory): ThemeBuild | null {
  const builder = BUILDERS[id];
  const labels = LABELS[id];
  return builder && labels ? { meshes: builder(mat), labels } : null;
}
