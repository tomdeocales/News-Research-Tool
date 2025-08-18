import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "vectorstore.json");

export async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
}

export async function loadStore() {
  try {
    const json = await fs.readFile(STORE_FILE, "utf-8");
    return JSON.parse(json);
  } catch {
    return { documents: [], vectors: [] };
  }
}

export async function saveStore(store) {
  await ensureDataDir();
  await fs.writeFile(STORE_FILE, JSON.stringify(store), "utf-8");
}

export async function appendToStore(newDocuments, newVectors) {
  const store = await loadStore();
  store.documents.push(...newDocuments);
  store.vectors.push(...newVectors);
  await saveStore(store);
  return store;
}


