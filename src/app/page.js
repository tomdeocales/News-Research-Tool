"use client";
import { useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);

  async function handleAsk() {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const body = {
        question,
        urls: url.trim() ? [url.trim()] : [],
      };
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setAnswer(json.answer);
      setSources(json.sources || []);
    } catch (e) {
      console.error(e);
      alert("Failed to get answer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>RockyBot: News Research Tool</h1>
          <p className={styles.subtitle}>Process article URLs, embed, and ask questions using OpenRouter.</p>
        </div>

        <section className={styles.section}>
          <label className={styles.label}>News Article URL</label>
          <input
            value={url}
            placeholder="Enter article URL"
            onChange={(e) => setUrl(e.target.value)}
            className={styles.input}
          />
        </section>

        {!!answer && (
          <section className={styles.section}>
            <label className={styles.label}>Answer</label>
            <div className={`${styles.card} ${styles.answerCard}`}>
              {answer}
            </div>
            {sources?.length > 0 && (
              <div>
                <div className={styles.label} style={{ marginBottom: 6 }}>Sources</div>
                <ul className={styles.sourcesList}>
                  {sources.map((s) => (
                    <li key={s}>
                      <a href={s} target="_blank" rel="noreferrer">
                        {s}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </main>

      <div className={styles.composer}>
        <div className={styles.composerInner}>
          <label className={styles.label}>Ask a question</label>
          <div className={styles.composerRow}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              placeholder="e.g., Summarize this news article"
              className={styles.textarea}
            />
            <button onClick={handleAsk} disabled={loading} className={styles.buttonPrimary}>
              {loading ? "Thinking..." : "Ask"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
