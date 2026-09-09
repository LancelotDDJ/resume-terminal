import fs from "node:fs/promises";

const requiredFields = [
  "id",
  "title",
  "en",
  "department",
  "category",
  "date",
  "lead",
  "clearance",
  "abstract",
  "source",
];
const isText = (value) => typeof value === "string" && value.trim().length > 0;

// One letter per category, in the user-facing category order.
const CATEGORY_PREFIX = {
  个人简介: "O",
  教育经历: "E",
  实习经历: "I",
  项目经历: "P",
  科研经历: "R",
  相关技能: "S",
};
const CATEGORY_COUNT = 6;
const RECORD_COUNT = 15;

export function validateContent(content) {
  const errors = [];
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    throw new Error("档案数据必须是 JSON 对象。");
  }
  for (const key of ["categories", "columns"]) {
    const names = content[key];
    if (!Array.isArray(names) || names.length !== CATEGORY_COUNT || !names.every(isText)) {
      errors.push(`${key}：必须包含六个非空分类名称`);
    } else if (new Set(names).size !== CATEGORY_COUNT || names.includes("全部档案")) {
      errors.push(`${key}：分类名称不能重复，也不能使用“全部档案”`);
    }
  }
  const categories = Array.isArray(content.categories)
    ? content.categories
    : [];
  const columns = Array.isArray(content.columns) ? content.columns : [];
  if (
    categories.some((name) => !columns.includes(name)) ||
    columns.some((name) => !categories.includes(name))
  ) {
    errors.push("categories 与 columns 必须包含相同的六个分类（顺序可以不同）");
  }
  const records = Array.isArray(content.records) ? content.records : [];
  if (records.length !== RECORD_COUNT)
    errors.push("records：当前内容集要求十五份档案");
  const ids = new Set();
  const seenInCategory = new Map();
  records.forEach((record, index) => {
    const label = `records[${index}]`;
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      errors.push(`${label}：必须是档案对象`);
      return;
    }
    for (const key of requiredFields) {
      if (!isText(record[key])) errors.push(`${label}.${key}：必须是非空文本`);
    }
    const prefix = CATEGORY_PREFIX[record.category];
    const next = (seenInCategory.get(record.category) ?? 0) + 1;
    seenInCategory.set(record.category, next);
    const expectedId = prefix
      ? `${prefix}-${String(next).padStart(3, "0")}`
      : record.id;
    if (prefix && record.id !== expectedId)
      errors.push(`${label}.id：应为 ${expectedId}，编号须按类内顺序保持稳定`);
    if (!/^[OEIPRS]-\d{3}$/.test(record.id))
      errors.push(`${label}.id：编号格式须为 类字母-三位数字（如 P-002）`);
    if (ids.has(record.id)) errors.push(`${label}.id：重复编号 ${record.id}`);
    ids.add(record.id);
    if (!categories.includes(record.category))
      errors.push(`${label}.category：未知分类 ${record.category}`);
    if (
      !Array.isArray(record.findings) ||
      record.findings.length === 0 ||
      !record.findings.every(isText)
    ) {
      errors.push(`${label}.findings：必须包含至少一条非空研究记录`);
    }
    try {
      const url = new URL(record.source);
      if (!["https:", "http:"].includes(url.protocol)) throw new Error();
    } catch {
      errors.push(`${label}.source：必须是有效的 HTTP 或 HTTPS 链接`);
    }
  });
  for (const name of columns) {
    if (!records.some((record) => record?.category === name)) {
      errors.push(`分类“${name}”：至少需要一份档案`);
    }
  }
  if (errors.length)
    throw new Error(`档案数据校验失败：\n- ${errors.join("\n- ")}`);
  return content;
}

export async function loadContent() {
  return validateContent(
    JSON.parse(
      await fs.readFile(
        new URL("../content/archives.json", import.meta.url),
        "utf8",
      ),
    ),
  );
}

export function archiveText(r) {
  return `\uFEFFDONG DEJIA · PERSONAL ARCHIVE\nFILE ${r.id} / ${r.title}\n${r.en}\n\n角色：${r.department}\n时期：${r.date}\n技术栈：${r.lead}\n访问范围：${r.clearance}\n\n${r.abstract}\n\n详细记录\n${r.findings.map((f, i) => `${i + 1}. ${f}`).join("\n")}\n\n相关链接：${r.source}\n本档案内容来自董德嘉本人真实简历。\n`;
}
