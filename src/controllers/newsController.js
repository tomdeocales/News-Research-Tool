import { z } from "zod";
import { buildChunksFromUrls, embedDocuments } from "../services/documentService";
import { appendToStore, loadStore, saveStore } from "../services/storeService";
import { embedTexts } from "../services/embeddingService";
import { chatCompletion } from "../services/llmService";
import { topKSimilar, cosineSimilarity } from "../lib/similarity";

const UrlsSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(5),
  replace: z.boolean().optional(),
});

export async function processUrls(body) {
  const parsed = UrlsSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, data: { error: "Invalid URLs" } };
  }
  const { urls, replace } = parsed.data;
  const documents = await buildChunksFromUrls(urls, { chunkSize: 1000, chunkOverlap: 200 });
  const vectors = await embedDocuments(documents);
  if (replace) {
    await saveStore({ documents, vectors });
  } else {
    await appendToStore(documents, vectors);
  }
  return { status: 200, data: { count: documents.length } };
}

const QuestionSchema = z.object({
  question: z.string().min(3),
  urls: z.array(z.string().url()).optional(),
});

function selectTopChunksPerUrl(urls, documents, vectors, queryVector) {
  const byUrl = new Map();
  documents.forEach((d, idx) => {
    if (!byUrl.has(d.url)) byUrl.set(d.url, []);
    byUrl.get(d.url).push(idx);
  });

  const selected = [];
  for (const url of urls) {
    const indices = byUrl.get(url) || [];
    if (indices.length === 0) continue;
    let bestIdx = indices[0];
    let bestScore = cosineSimilarity(queryVector, vectors[bestIdx]);
    for (let i = 1; i < indices.length; i++) {
      const idx = indices[i];
      const s = cosineSimilarity(queryVector, vectors[idx]);
      if (s > bestScore) {
        bestScore = s;
        bestIdx = idx;
      }
    }
    selected.push({ idx: bestIdx, score: bestScore });
  }
  return selected;
}

function fillWithGlobalTop(selected, vectors, queryVector, limit = 6) {
  const globalTop = topKSimilar(queryVector, vectors, Math.min(10, vectors.length));
  const selectedSet = new Set(selected.map((s) => s.idx));
  for (const g of globalTop) {
    if (selected.length >= limit) break;
    if (!selectedSet.has(g.idx)) {
      selected.push(g);
      selectedSet.add(g.idx);
    }
  }
  return selected;
}

async function buildContextFromUrls(urls, question) {
  const documents = await buildChunksFromUrls(urls, { chunkSize: 1000, chunkOverlap: 200 });
  const vectors = await embedDocuments(documents);
  await saveStore({ documents, vectors });
  const [queryVector] = await embedTexts([question]);

  let selected = selectTopChunksPerUrl(urls, documents, vectors, queryVector);
  selected = fillWithGlobalTop(selected, vectors, queryVector);
  selected.sort((a, b) => b.score - a.score);

  return selected.map((t) => ({ ...documents[t.idx], score: t.score }));
}

async function buildContextFromStore(question) {
  const store = await loadStore();
  if (store.vectors.length === 0) return [];
  const [queryVector] = await embedTexts([question]);
  const top = topKSimilar(queryVector, store.vectors, 5);
  return top.map((t) => ({ ...store.documents[t.idx], score: t.score }));
}

function buildMessages(question, contexts) {
  const system = "You are a helpful financial news assistant. Answer using the provided context. If unsure, say you don't know. Do NOT include a Sources section; the client will display sources separately.";
  const contextText = contexts.map((c, i) => `[#${i + 1} ${c.url}] ${c.content}`).join("\n\n");
  return [
    { role: "system", content: system },
    { role: "user", content: `Question: ${question}\n\nContext:\n${contextText}` },
  ];
}

export async function askQuestion(body) {
  const parsed = QuestionSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, data: { error: "Invalid question" } };
  }
  const { question, urls } = parsed.data;

  const isEphemeral = process.env.VERCEL === "1" || process.env.PERSIST_STORE === "false";
  if (isEphemeral && (!urls || urls.length === 0)) {
    return {
      status: 400,
      data: { error: "Please provide at least one URL. In production mode, URLs are required for context." },
    };
  }

  const contexts = urls && urls.length > 0
    ? await buildContextFromUrls(urls, question)
    : await buildContextFromStore(question);

  const messages = buildMessages(question, contexts);
  let answer = await chatCompletion(messages);
  answer = answer.replace(/\n+Sources:[\s\S]*$/i, "").trim();

  return {
    status: 200,
    data: { answer, sources: Array.from(new Set(contexts.map((c) => c.url))) },
  };
}
