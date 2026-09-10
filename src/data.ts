import content from "../content/archives.json" with { type: "json" };
import type { TimelineEntry } from "./gantt";

export interface ArchiveRecord {
  id: string;
  title: string;
  en: string;
  department: string;
  category: string;
  date: string;
  lead: string;
  clearance: string;
  abstract: string;
  findings: string[];
  source: string;
  timeline?: TimelineEntry[];
}

export const records: ArchiveRecord[] = content.records;
export const categories = ["全部档案", ...content.categories];
export const archiveColumns = content.columns;

// English labels for the six categories (letter prefix in parentheses), used
// wherever an English category name is shown, e.g. the 3D cassette label.
export const categoryEn: Record<string, string> = {
  个人简介: "PROFILE",
  教育经历: "EDUCATION",
  实习经历: "INTERNSHIP",
  项目经历: "PROJECT",
  科研经历: "RESEARCH",
  相关技能: "SKILLS",
};

export function columnFiles(lane: number) {
  return records
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => record.category === archiveColumns[lane])
    .map(({ index }) => index);
}
export function fileLocation(index: number) {
  const lane = archiveColumns.indexOf(records[index].category);
  const row = 12 + columnFiles(lane).indexOf(index);
  return { lane, row, slot: lane * 32 + row };
}
export function fileAtSlot(slot: number) {
  const files = columnFiles(Math.floor(slot / 32));
  return files[Math.max(0, Math.min(files.length - 1, (slot % 32) - 12))];
}
