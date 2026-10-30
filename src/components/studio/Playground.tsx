"use client";

import { useState } from "react";
import { useStudioStore } from "@/lib/store";

type Msg = { role: "user" | "assistant"; content: string };

export default function Playground() {
  const selectedNodeId = useStudioStore((s) => s.selectedNodeId);
  const nodes = useStudioStore((s) => s.nodes);
  const apiKeys = useStudioStore((s) => s.apiKeys);
  const node = nodes.find((n) => n.id === selectedNodeId);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!node || !input.trim()) return;
    const next = [...messages, { role: "user" as const, content: input }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: node.data.provider,
          apiKey: apiKeys[node.data.provider] ?? "",
          model: node.data.model,
          systemPrompt: node.data.systemPrompt,
          messages: next,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setMessages([...next, { role: "assistant", content: json.text }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!node) {
    return (
      <div className="flex h-56 items-center justify-center border-t border-hair px-6 text-center">
        <p className="text-sm text-faint">
          Select an agent node to test it here.
        </p>
      </div>
    );
  }

  const hasKey = Boolean(apiKeys[node.data.provider]);

  return (
    <div className="flex h-56 flex-col border-t border-hair">
      <div className="flex items-center justify-between border-b border-hair px-4 py-2">
        <p className="font-mono text-[10px] tracking-widest text-faint">
          PLAYGROUND · {node.data.label.toUpperCase()}
        </p>
        {!hasKey && (
          <span className="font-mono text-[10px] text-accent">
            no {node.data.provider} key set
          </span>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-sm text-faint">No messages yet.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className="text-sm">
            <span
              className="font-mono text-[10px]"
              style={{
                color:
                  m.role === "user"
                    ? "var(--color-text-dim)"
                    : "var(--color-accent)",
              }}
            >
              {m.role === "user" ? "YOU" : "AGENT"}
            </span>
            <p className="text-dim">{m.content}</p>
          </div>
        ))}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <div className="flex gap-2 border-t border-hair p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Send a test prompt…"
          className="flex-1 rounded-lg border-hair bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--color-accent-line)]"
        />
        <button
          onClick={send}
          disabled={loading}
          className="rounded-lg bg-[color:var(--color-accent)] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {loading ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
