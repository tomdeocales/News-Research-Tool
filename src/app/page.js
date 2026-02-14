"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import styles from "./page.module.css";

const SUGGESTIONS = [
  "Summarize this article",
  "What are the key takeaways?",
  "Who are the people mentioned?",
  "What is the timeline of events?",
];

function LinkIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M6.5 8.5a3 3 0 004.243 0l2-2a3 3 0 00-4.243-4.243l-1 1" />
      <path d="M9.5 7.5a3 3 0 00-4.243 0l-2 2a3 3 0 004.243 4.243l1-1" />
    </svg>
  );
}

function SendIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M3.105 2.29a.75.75 0 01.814-.12l13.5 6.5a.75.75 0 010 1.36l-13.5 6.5a.75.75 0 01-1.06-.87L4.88 10.5H9.25a.75.75 0 000-1.5H4.88L2.86 3.16a.75.75 0 01.246-.87z" />
    </svg>
  );
}

function BotIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3v1M6 7h8a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2zM7.5 10.5h0M12.5 10.5h0M8 13.5s.8.5 2 .5 2-.5 2-.5" />
    </svg>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const threadRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }

  async function handleAsk(text) {
    const q = (text || question).trim();
    if (!q || loading) return;

    const userMsg = { role: "user", content: q, url: url.trim() || null };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const body = {
        question: q,
        urls: url.trim() ? [url.trim()] : [],
      };
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let errMsg = "Something went wrong.";
        try {
          const errJson = await res.json();
          errMsg = errJson.error || errMsg;
        } catch {
          errMsg = await res.text();
        }
        throw new Error(errMsg);
      }
      const json = await res.json();
      const assistantMsg = {
        role: "assistant",
        content: json.answer,
        sources: json.sources || [],
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      console.error(e);
      const errorMsg = {
        role: "assistant",
        content: `Sorry, ${e.message || "something went wrong. Please try again."}`,
        sources: [],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  function handleSuggestion(text) {
    handleAsk(text);
  }

  const hasMessages = messages.length > 0;

  return (
    <div className={styles.page}>
      <div className={styles.topBanner}>
        <span className={styles.bannerDot} />
        Vibe-coded with <strong>Opus 4.6</strong> using Claude Code CLI &mdash; plugins: <strong>ralph-wiggum</strong> &amp; <strong>ralph-loop</strong>
      </div>
      <div className={styles.conversation}>
        {!hasMessages ? (
          <div className={styles.hero}>
            <div className={styles.logoMark}>
              <BotIcon className={styles.logoIcon} />
            </div>
            <h1 className={styles.heroTitle}>What would you like to know?</h1>
            <p className={styles.heroSubtitle}>
              Paste a news article URL and ask any question about it.
            </p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button key={s} className={styles.suggestion} onClick={() => handleSuggestion(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.thread} ref={threadRef}>
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className={`${styles.message} ${styles.userMessage}`}>
                  <div>
                    {msg.url && (
                      <div className={styles.userMeta}>
                        <span className={styles.urlChip}>{msg.url}</span>
                      </div>
                    )}
                    <div className={styles.userBubble}>{msg.content}</div>
                  </div>
                </div>
              ) : (
                <div key={i} className={`${styles.message} ${styles.assistantMessage}`}>
                  <div className={styles.avatar}>
                    <BotIcon className={styles.avatarIcon} />
                  </div>
                  <div className={styles.assistantContent}>
                    <div className={styles.assistantBubble}>{msg.content}</div>
                    {msg.sources?.length > 0 && (
                      <div className={styles.sources}>
                        <div className={styles.sourcesLabel}>Sources</div>
                        <ul className={styles.sourcesList}>
                          {msg.sources.map((s) => (
                            <li key={s} className={styles.sourceItem}>
                              <a href={s} target="_blank" rel="noreferrer">{s}</a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
            {loading && (
              <div className={`${styles.message} ${styles.assistantMessage}`}>
                <div className={styles.avatar}>
                  <BotIcon className={styles.avatarIcon} />
                </div>
                <div className={styles.assistantContent}>
                  <div className={styles.loadingBubble}>
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.composer}>
        <div className={styles.composerInner}>
          <div className={styles.composerCard}>
            <div className={styles.urlRow}>
              <LinkIcon className={styles.urlIcon} />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste article URL (optional)"
                className={styles.urlInput}
              />
            </div>
            <div className={styles.inputRow}>
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => { setQuestion(e.target.value); autoResize(); }}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask about the article..."
                className={styles.textarea}
              />
              <button
                onClick={() => handleAsk()}
                disabled={loading || !question.trim()}
                className={styles.sendButton}
                aria-label="Send"
              >
                <SendIcon className={styles.sendIcon} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
