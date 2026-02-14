import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "vectorstore.json");

function isEphemeral() {
  return process.env.VERCEL === "1" || process.env.PERSIST_STORE === "false";
}

export async function ensureDataDir() {
  if (isEphemeral()) return;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (_) { /* directory may already exist */ }
}

export async function loadStore() {
  if (isEphemeral()) {
    return { documents: [], vectors: [] };
  }
  try {
    const json = await fs.readFile(STORE_FILE, "utf-8");
    return JSON.parse(json);
  } catch {
    return { documents: [], vectors: [] };
  }
}

export async function saveStore(store) {
  if (isEphemeral()) return;
  await ensureDataDir();
  await fs.writeFile(STORE_FILE, JSON.stringify(store), "utf-8");
}

export async function appendToStore(newDocuments, newVectors) {
  if (isEphemeral()) {
    return { documents: newDocuments, vectors: newVectors };
  }
  const store = await loadStore();
  store.documents.push(...newDocuments);
  store.vectors.push(...newVectors);
  await saveStore(store);
  return store;
}
