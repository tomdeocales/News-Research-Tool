import { pipeline } from "@xenova/transformers";

let embeddingPipelinePromise = null;

async function getEmbeddingPipeline() {
  if (!embeddingPipelinePromise) {
    embeddingPipelinePromise = pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
  }
  return embeddingPipelinePromise;
}

function l2Normalize(vector) {
  const epsilon = 1e-12;
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) + epsilon;
  return vector.map((v) => v / norm);
}

export async function embedTexts(texts) {
  const extractor = await getEmbeddingPipeline();
  const embeddings = [];
  for (const text of texts) {
    const output = await extractor(text, { pooling: "mean", normalize: false });
    const vector = Array.from(output.data);
    embeddings.push(l2Normalize(vector));
  }
  return embeddings;
}
