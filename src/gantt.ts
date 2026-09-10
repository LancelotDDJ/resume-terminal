// Personal timeline rendered as a compact Gantt chart inside the detail
// panel. Bars sit on a 2020.10 -> now axis; ongoing spans are highlighted,
// single-month events collapse to diamonds.
export interface TimelineEntry {
  lane: string;
  label: string;
  from: string; // "YYYY.MM"
  to: string; // "YYYY.MM" or "至今"
}

const monthValue = (value: string) => {
  const [year, month] = value.split(".").map(Number);
  return year + (month - 1) / 12;
};
const textWidth = (text: string, px: number) =>
  [...text].reduce((w, ch) => w + (ch.charCodeAt(0) > 0xff ? px : px * 0.56), 0);
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function renderTimeline(entries: TimelineEntry[]): string {
  const now = (() => {
    const d = new Date();
    return d.getFullYear() + d.getMonth() / 12;
  })();
  const W = 636,
    leftPad = 66,
    rightPad = 10,
    top = 30,
    rowH = 16,
    barH = 9;
  const from = 2020.75; // 2020.10, 本科入学
  const to = Math.max(now + 0.32, ...entries.map((e) => monthValue(e.from) + 0.3));
  const span = to - from;
  const X = (v: number) => leftPad + ((v - from) / span) * (W - leftPad - rightPad);
  const H = top + entries.length * rowH + 8;

  const parts: string[] = [];
  // Year grid + axis labels.
  for (let year = 2021; year <= Math.floor(to); year++) {
    const x = X(year).toFixed(1);
    parts.push(`<line class="grid" x1="${x}" y1="${top - 14}" x2="${x}" y2="${H - 4}"/>`);
    parts.push(`<text class="axis" x="${x}" y="${top - 19}" text-anchor="middle">${year}</text>`);
  }
  // Now marker.
  const nowX = X(now).toFixed(1);
  parts.push(`<line class="now" x1="${nowX}" y1="${top - 14}" x2="${nowX}" y2="${H - 4}"/>`);
  parts.push(`<text class="axis now-label" x="${nowX}" y="${top - 19}" text-anchor="end">现在</text>`);

  entries.forEach((entry, i) => {
    const y = top + i * rowH + rowH / 2;
    const start = monthValue(entry.from);
    const ongoing = entry.to === "至今";
    const end = ongoing ? now : monthValue(entry.to);
    const x1 = X(start),
      x2 = X(Math.max(end, start + 0.02));
    parts.push(
      `<text class="lane" x="2" y="${(y + 3).toFixed(1)}">${esc(entry.lane)}</text>`,
    );
    const isPoint = end - start < 0.12;
    if (isPoint) {
      parts.push(
        `<path class="bar${ongoing ? " ongoing" : ""}" d="M ${x1.toFixed(1)} ${(y - 4.5).toFixed(1)} l 4.5 4.5 l -4.5 4.5 l -4.5 -4.5 Z"><title>${esc(entry.label)}（${entry.from}）</title></path>`,
      );
    } else {
      parts.push(
        `<rect class="bar${ongoing ? " ongoing" : ""}" x="${x1.toFixed(1)}" y="${(y - barH / 2).toFixed(1)}" width="${Math.max(3, x2 - x1).toFixed(1)}" height="${barH}" rx="2"><title>${esc(entry.label)}（${entry.from} - ${entry.to}）</title></rect>`,
      );
    }
    // Label: left of the bar when there is room, otherwise right of it.
    const lw = textWidth(entry.label, 9);
    const label = esc(entry.label);
    if (x1 - lw - 6 > leftPad) {
      parts.push(
        `<text class="item" x="${(x1 - 5).toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="end">${label}</text>`,
      );
    } else {
      const lx = isPoint ? x1 + 9 : x2 + 5;
      parts.push(
        `<text class="item" x="${lx.toFixed(1)}" y="${(y + 3).toFixed(1)}">${label}</text>`,
      );
    }
  });
  return `<svg class="gantt" viewBox="0 0 ${W} ${H}" role="img" aria-label="个人时间轴：${entries.length} 段经历">${parts.join("")}</svg>`;
}
