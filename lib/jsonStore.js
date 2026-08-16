import { promises as fs } from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");

export async function readJsonCollection(fileName) {
  const filePath = path.join(dataDir, fileName);
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function writeJsonCollection(fileName, data) {
  const filePath = path.join(dataDir, fileName);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function createRecord(fileName, payload) {
  const records = await readJsonCollection(fileName);
  const record = { id: crypto.randomUUID(), ...payload };
  records.push(record);
  await writeJsonCollection(fileName, records);
  return record;
}

export async function updateRecord(fileName, id, updates) {
  const records = await readJsonCollection(fileName);
  const index = records.findIndex((item) => String(item.id) === String(id));
  if (index === -1) return null;
  records[index] = { ...records[index], ...updates };
  await writeJsonCollection(fileName, records);
  return records[index];
}

export async function deleteRecord(fileName, id) {
  const records = await readJsonCollection(fileName);
  const filtered = records.filter((item) => String(item.id) !== String(id));
  if (filtered.length === records.length) return false;
  await writeJsonCollection(fileName, filtered);
  return true;
}
