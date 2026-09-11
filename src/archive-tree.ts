// A retro file-explorer tree navigator for the archive: square markers, hairline
// connectors, six category nodes with their records. Categories expand and
// collapse with an accordion transition, rows highlight on hover, clicking a
// record jumps straight to it, and the tree mirrors the current selection.
import { archiveColumns, columnFiles, records } from "./data";

const ROW = 26; // px per record row, used for the accordion height

export function buildArchiveTree(
  host: HTMLElement,
  onJump: (index: number) => void,
): { update: (index: number) => void } {
  host.className = "archive-tree";
  host.setAttribute("role", "tree");

  host.innerHTML = `
    <div class="tree-head">
      <span>ARCHIVE TREE / 档案树</span>
      <div class="tree-actions">
        <button type="button" data-tree="expand">＋ 全部展开</button>
        <button type="button" data-tree="collapse">− 全部收起</button>
      </div>
    </div>
    <div class="tree-scroll" role="presentation">
      <div class="tree-root-label">PERSONAL ARCHIVE</div>
    </div>`;

  const scroll = host.querySelector<HTMLElement>(".tree-scroll")!;
  const childBoxes: HTMLElement[] = [];
  const catRows: HTMLElement[] = [];
  const markers: HTMLElement[] = [];
  const recordRows = new Map<number, HTMLElement>();

  archiveColumns.forEach((category, lane) => {
    const files = columnFiles(lane);

    const row = document.createElement("button");
    row.type = "button";
    row.className = "tree-row tree-cat";
    row.style.setProperty("--depth", "0");
    row.setAttribute("role", "treeitem");
    row.setAttribute("aria-expanded", "false");
    row.innerHTML = `
      <i class="tree-marker" aria-hidden="true">+</i>
      <span class="tree-cat-name">${category}</span>
      <span class="tree-count">${files.length}</span>`;
    catRows.push(row);

    const box = document.createElement("div");
    box.className = "tree-children closed";
    box.style.maxHeight = `${files.length * ROW + 8}px`;
    files.forEach((index, order) => {
      const r = records[index];
      const leaf = document.createElement("button");
      leaf.type = "button";
      leaf.className = "tree-row tree-leaf" + (order === files.length - 1 ? " last" : "");
      leaf.style.setProperty("--depth", "1");
      leaf.setAttribute("role", "treeitem");
      leaf.dataset.treeLeaf = String(index);
      leaf.innerHTML = `
        <i class="tree-leaf-marker" aria-hidden="true"></i>
        <span class="tree-id">${r.id}</span>
        <span class="tree-name">${r.title}</span>`;
      leaf.addEventListener("click", () => onJump(index));
      recordRows.set(index, leaf);
      box.append(leaf);
    });
    childBoxes.push(box);

    row.addEventListener("click", () => toggle(lane));
    scroll.append(row, box);
    markers.push(row.querySelector<HTMLElement>(".tree-marker")!);
  });

  function toggle(lane: number, forceClosed?: boolean) {
    const box = childBoxes[lane];
    const closed = forceClosed ?? !box.classList.contains("closed");
    box.classList.toggle("closed", closed);
    markers[lane].textContent = closed ? "+" : "−";
    catRows[lane].setAttribute("aria-expanded", String(!closed));
  }
  function toggleAll(closed: boolean) {
    childBoxes.forEach((_, lane) => toggle(lane, closed));
  }

  host
    .querySelector('[data-tree="expand"]')!
    .addEventListener("click", () => toggleAll(false));
  host
    .querySelector('[data-tree="collapse"]')!
    .addEventListener("click", () => toggleAll(true));

  function update(index: number) {
    for (const leaf of recordRows.values()) leaf.classList.remove("current");
    const leaf = recordRows.get(index);
    if (!leaf) return;
    leaf.classList.add("current");
    // Keep the selected record's category open and in view.
    const lane = childBoxes.indexOf(leaf.parentElement as HTMLElement);
    if (lane >= 0 && leaf.parentElement!.classList.contains("closed"))
      toggle(lane, false);
    leaf.scrollIntoView({ block: "nearest" });
  }

  return { update };
}
