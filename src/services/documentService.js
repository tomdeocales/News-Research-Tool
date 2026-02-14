import * as cheerio from "cheerio";
import { v4 as uuidv4 } from "uuid";
import { chunkText } from "../lib/chunk";
import { embedTexts } from "./embeddingService";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "metadata.google.internal",
]);

const BLOCKED_IP_PREFIXES = [
  "10.",
  "172.16.", "172.17.", "172.18.", "172.19.",
  "172.20.", "172.21.", "172.22.", "172.23.",
  "172.24.", "172.25.", "172.26.", "172.27.",
  "172.28.", "172.29.", "172.30.", "172.31.",
  "192.168.",
  "169.254.",
  "0.",
];

function validateUrl(input) {
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error(`Invalid URL: ${input}`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Blocked URL protocol: ${parsed.protocol}`);
  }
  const hostname = parsed.hostname;
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error(`Blocked URL: requests to ${hostname} are not allowed`);
  }
  if (BLOCKED_IP_PREFIXES.some((prefix) => hostname.startsWith(prefix))) {
    throw new Error(`Blocked URL: requests to private IPs are not allowed`);
  }
}

export async function fetchUrlText(url) {
  validateUrl(url);
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
  const validUrls = urls.filter(Boolean);
  const results = await Promise.all(
    validUrls.map(async (url) => {
      const rawText = await fetchUrlText(url);
      return { url, rawText };
    })
  );
  const documents = [];
  for (const { url, rawText } of results) {
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
