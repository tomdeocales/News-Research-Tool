const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

function splitByDelimiters(text) {
  return text
    .replace(/\r\n/g, "\n")
    .split(/(?<=[\.!?])\s+|\n{2,}|\n|,\s+/g)
    .filter((t) => t && t.trim().length > 0);
}

export function chunkText(text, chunkSize = DEFAULT_CHUNK_SIZE, chunkOverlap = DEFAULT_CHUNK_OVERLAP) {
  const parts = splitByDelimiters(text);
  const chunks = [];
  let buffer = "";
  for (const part of parts) {
    const candidate = buffer.length === 0 ? part : buffer + " " + part;
    if (candidate.length <= chunkSize) {
      buffer = candidate;
    } else {
      if (buffer.trim().length > 0) {
        chunks.push(buffer.trim());
      }
      // start new buffer with overlap from previous
      const overlapStart = Math.max(0, buffer.length - chunkOverlap);
      const overlap = buffer.slice(overlapStart);
      buffer = overlap + (overlap.length ? " " : "") + part;
    }
  }
  if (buffer.trim().length > 0) {
    chunks.push(buffer.trim());
  }
  return chunks;
}


