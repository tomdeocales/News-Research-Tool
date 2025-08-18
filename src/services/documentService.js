import * as cheerio from "cheerio";
import { v4 as uuidv4 } from "uuid";
import { chunkText } from "../lib/chunk";
import { embedTexts } from "./embeddingService";

export async function fetchUrlText(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) {
    throw new Error(`Failed to fetch URL: ${url}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);
  // Remove script/style/nav/footer to reduce noise
  ["script", "style", "nav", "footer", "noscript"].forEach((sel) => $(sel).remove());
  const text = $("body").text().replace(/\s+/g, " ").trim();
  return text;
}

export async function buildChunksFromUrls(urls, options = {}) {
  const documents = [];
  for (const url of urls) {
    if (!url) continue;
    const rawText = await fetchUrlText(url);
    const chunks = chunkText(rawText, options.chunkSize, options.chunkOverlap);
    chunks.forEach((content, index) => {
      documents.push({ id: uuidv4(), url, content, chunkIndex: index });
    });
  }
  return documents;
}

export async function embedDocuments(documents) {
  const texts = documents.map((d) => d.content);
  const vectors = await embedTexts(texts);
  return vectors;
}


