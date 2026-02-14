export async function chatCompletion(messages) {
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
