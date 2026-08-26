"use client";

import { useEffect, useRef, useState } from "react";

const SUGGESTIONS = [
  "Top 5 shows for me right now",
  "Something funny, under 2 hours",
  "I'm feeling a bit down tonight, what should I watch?",
];

export default function ChatPageClient({ initialMessages }) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const windowRef = useRef(null);

  useEffect(() => {
    if (windowRef.current) {
      windowRef.current.scrollTop = windowRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setError("");
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: "user", content: trimmed }]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "The chatbot ran into a problem.");
      setMessages((prev) => [...prev, { id: `reply-${Date.now()}`, role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="chat-window" ref={windowRef}>
        {messages.length === 0 && (
          <div className="chat-bubble assistant">
            Hey! Want a recommendation, or want to tell me about something you just watched?
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble ${m.role}`}>
            {m.content}
          </div>
        ))}
        {sending && <div className="chat-bubble assistant">...</div>}
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="chip-row">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="chip chip-add" onClick={() => sendMessage(s)}>
            &quot;{s}&quot;
          </button>
        ))}
      </div>

      <form
        className="chat-input-row"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
      >
        <input type="text" placeholder="Type a message..." value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn btn-primary" type="submit" disabled={sending}>
          Send
        </button>
      </form>
    </>
  );
}
