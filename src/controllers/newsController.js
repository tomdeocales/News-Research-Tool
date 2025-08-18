import { z } from "zod";
import { buildChunksFromUrls, embedDocuments } from "../services/documentService";
import { appendToStore, loadStore, saveStore } from "../services/storeService";
import { embedTexts } from "../services/embeddingService";
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

export async function retrieveContext(question, k = 5) {
  const store = await loadStore();
  const [queryVector] = await embedTexts([question]);
  const top = topKSimilar(queryVector, store.vectors, k);
  const contexts = top.map((t) => ({ ...store.documents[t.idx], score: t.score }));
  return contexts;
}

export async function askQuestion(body) {
  const parsed = QuestionSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, data: { error: "Invalid question" } };
  }
  const { question, urls } = parsed.data;
  
  // In ephemeral mode (Vercel), require URLs for context
  const isEphemeral = process.env.VERCEL === "1" || process.env.PERSIST_STORE === "false";
  if (isEphemeral && (!urls || urls.length === 0)) {
    return { 
      status: 400, 
      data: { 
        error: "Please provide at least one URL. In production mode, URLs are required for context." 
      } 
    };
  }
  
  let contexts;
  if (urls && urls.length > 0) {
    // Ephemeral: build context strictly from current input URLs
    const documents = await buildChunksFromUrls(urls, { chunkSize: 1000, chunkOverlap: 200 });
    const vectors = await embedDocuments(documents);
    // Overwrite persisted store with only current URLs
    await saveStore({ documents, vectors });
    const [queryVector] = await embedTexts([question]);
    // Ensure each provided URL contributes at least its top chunk
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

    // Fill remaining with global top until we have up to 6 chunks
    const globalTop = topKSimilar(queryVector, vectors, Math.min(10, vectors.length));
    const selectedSet = new Set(selected.map((s) => s.idx));
    for (const g of globalTop) {
      if (selected.length >= 6) break;
      if (!selectedSet.has(g.idx)) {
        selected.push(g);
        selectedSet.add(g.idx);
      }
    }
    // Map to contexts and sort by score descending
    selected.sort((a, b) => b.score - a.score);
    contexts = selected.map((t) => ({ ...documents[t.idx], score: t.score }));
  } else {
    // No URLs provided: clear store and answer without retrieval context
    await saveStore({ documents: [], vectors: [] });
    contexts = [];
  }
  const system = "You are a helpful financial news assistant. Answer using the provided context. If unsure, say you don't know. Do NOT include a Sources section; the client will display sources separately.";
  const contextText = contexts.map((c, i) => `[#${i + 1} ${c.url}] ${c.content}`).join("\n\n");
  const messages = [
    { role: "system", content: system },
    { role: "user", content: `Question: ${question}\n\nContext:\n${contextText}` },
  ];
  let answer = await callOpenRouter(messages);
  // Strip any model-inserted Sources section to avoid duplicates
  answer = answer.replace(/\n+Sources:[\s\S]*$/i, "").trim();
  return { status: 200, data: { answer, sources: Array.from(new Set(contexts.map((c) => c.url))) } };
}

async function callOpenRouter(messages) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
      "X-Title": process.env.SITE_NAME || "News Research Tool",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
      messages,
      temperature: 0.2,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content || "";
}


