export function cosineSimilarity(vecA, vecB) {
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return dot;
}

export function topKSimilar(queryVector, vectors, k = 5) {
  const scores = vectors.map((v, idx) => ({ idx, score: cosineSimilarity(queryVector, v) }));
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, Math.min(k, scores.length));
}
