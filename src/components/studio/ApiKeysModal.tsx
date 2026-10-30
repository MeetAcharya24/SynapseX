"use client";

import { useStudioStore, type Provider } from "@/lib/store";

const providers: { id: Provider; label: string; help: string }[] = [
  { id: "openai", label: "OpenAI", help: "platform.openai.com/api-keys" },
  {
    id: "anthropic",
    label: "Anthropic",
    help: "console.anthropic.com/settings/keys",
  },
  { id: "google", label: "Google", help: "aistudio.google.com/apikey" },
];

export default function ApiKeysModal({ onClose }: { onClose: () => void }) {
  const apiKeys = useStudioStore((s) => s.apiKeys);
  const setApiKey = useStudioStore((s) => s.setApiKey);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border-hair bg-elevated p-6"
      >
        <p className="font-display text-xl tracking-tight">API keys</p>
        <p className="mt-1 text-sm text-faint">
          Stored only in your browser, sent straight through to the provider
          you call. Never saved on our side.
        </p>

        <div className="mt-5 space-y-4">
          {providers.map((p) => (
            <label key={p.id} className="block">
              <div className="flex items-baseline justify-between">
                <span className="text-sm">{p.label}</span>
                <span className="font-mono text-[10px] text-faint">
                  {p.help}
                </span>
              </div>
              <input
                type="password"
                value={apiKeys[p.id] ?? ""}
                onChange={(e) => setApiKey(p.id, e.target.value)}
                placeholder="sk-…"
                className="mt-1 w-full rounded-lg border-hair bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--color-accent-line)]"
              />
            </label>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-[color:var(--color-accent)] py-2.5 text-sm font-medium text-black"
        >
          Done
        </button>
      </div>
    </div>
  );
}
