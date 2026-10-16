import { promises as fs } from "fs";
import path from "path";
import os from "os";

import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Load initial seed data so Webpack/Next.js bundles it into the deployment bundle.
// This guarantees data is always available on serverless platforms (like Vercel).
const SEED_DATA = {
  "books.json": require("../data/books.json"),
  "borrowers.json": require("../data/borrowers.json"),
  "ebooks.json": require("../data/ebooks.json"),
  "fines.json": require("../data/fines.json"),
  "library-settings.json": require("../data/library-settings.json"),
  "loans.json": require("../data/loans.json"),
  "notifications.json": require("../data/notifications.json"),
  "requests.json": require("../data/requests.json"),
  "sessions.json": require("../data/sessions.json"),
  "users.json": require("../data/users.json"),
};

// Global in-memory cache to maintain state across requests in warm serverless containers
if (!globalThis.__library_store) {
  globalThis.__library_store = {};
}
if (!globalThis.__ebook_buffers) {
  globalThis.__ebook_buffers = new Map();
}

const localDataDir = path.join(process.cwd(), "data");
const tmpDataDir = path.join(os.tmpdir(), "library_mgmt_data");

function cloneSeed(data, isArray = true) {
  if (data === undefined || data === null) return isArray ? [] : {};
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return isArray ? [] : {};
  }
}

export async function readJsonData(fileName, isArray = false) {
  // 1. Return from in-memory cache if modified during this container's lifetime
  if (globalThis.__library_store[fileName] !== undefined) {
    return globalThis.__library_store[fileName];
  }

  // 2. Check writable tmp directory
  try {
    const tmpFile = path.join(tmpDataDir, fileName);
    const content = await fs.readFile(tmpFile, "utf8");
    const parsed = JSON.parse(content);
    globalThis.__library_store[fileName] = parsed;
    return parsed;
  } catch {}

  // 3. Check local filesystem data directory
  try {
    const localFile = path.join(localDataDir, fileName);
    const content = await fs.readFile(localFile, "utf8");
    const parsed = JSON.parse(content);
    globalThis.__library_store[fileName] = parsed;
    return parsed;
  } catch {}

  // 4. Fallback to bundled seed data
  const seed = cloneSeed(SEED_DATA[fileName], isArray);
  globalThis.__library_store[fileName] = seed;
  return seed;
}

export async function writeJsonData(fileName, data) {
  // Update in-memory cache immediately
  globalThis.__library_store[fileName] = data;

  const content = JSON.stringify(data, null, 2);

  // Try writing to local project directory (works in local dev)
  try {
    const localFile = path.join(localDataDir, fileName);
    await fs.writeFile(localFile, content, "utf8");
    return;
  } catch {
    // Expected on read-only serverless filesystems like Vercel
  }

  // If local write fails, persist to /tmp (writable in serverless)
  try {
    await fs.mkdir(tmpDataDir, { recursive: true });
    const tmpFile = path.join(tmpDataDir, fileName);
    await fs.writeFile(tmpFile, content, "utf8");
  } catch (err) {
    console.warn(`[jsonStore] Warning: Failed to write ${fileName} to /tmp:`, err.message);
  }
}

export async function readJsonCollection(fileName) {
  const result = await readJsonData(fileName, true);
  return Array.isArray(result) ? result : [];
}

export async function writeJsonCollection(fileName, data) {
  return writeJsonData(fileName, Array.isArray(data) ? data : []);
}

export async function createRecord(fileName, payload) {
  const records = await readJsonCollection(fileName);
  const id = payload?.id ? String(payload.id) : crypto.randomUUID();
  const record = { ...payload, id };
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

export async function saveEbookFile(storageFilename, buffer) {
  const safeFilename = path.basename(storageFilename);
  globalThis.__ebook_buffers.set(safeFilename, buffer);

  // Try writing to local data/ebooks
  try {
    const localEbooksDir = path.join(localDataDir, "ebooks");
    await fs.mkdir(localEbooksDir, { recursive: true });
    await fs.writeFile(path.join(localEbooksDir, safeFilename), buffer);
    return;
  } catch {}

  // Try writing to /tmp
  try {
    const tmpEbooksDir = path.join(tmpDataDir, "ebooks");
    await fs.mkdir(tmpEbooksDir, { recursive: true });
    await fs.writeFile(path.join(tmpEbooksDir, safeFilename), buffer);
  } catch (err) {
    console.warn("[jsonStore] Warning: could not write ebook file to /tmp:", err.message);
  }
}

export async function readEbookFile(storageFilename) {
  const safeFilename = path.basename(storageFilename);

  // 1. Check in-memory buffer
  if (globalThis.__ebook_buffers.has(safeFilename)) {
    return globalThis.__ebook_buffers.get(safeFilename);
  }

  // 2. Check /tmp
  try {
    const tmpPath = path.join(tmpDataDir, "ebooks", safeFilename);
    return await fs.readFile(tmpPath);
  } catch {}

  // 3. Check local data/ebooks
  try {
    const localPath = path.join(localDataDir, "ebooks", safeFilename);
    return await fs.readFile(localPath);
  } catch {}

  // 4. Check public/ebooks
  try {
    const publicPath = path.join(process.cwd(), "public", "ebooks", safeFilename);
    return await fs.readFile(publicPath);
  } catch {}

  return null;
}

export async function deleteEbookFile(storageFilename) {
  const safeFilename = path.basename(storageFilename);
  globalThis.__ebook_buffers.delete(safeFilename);

  try {
    await fs.unlink(path.join(tmpDataDir, "ebooks", safeFilename));
  } catch {}

  try {
    await fs.unlink(path.join(localDataDir, "ebooks", safeFilename));
  } catch {}
}
