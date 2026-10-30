"use client";

import { useStudioStore } from "@/lib/store";

export default function Sidebar({
  onOpenKeys,
}: {
  onOpenKeys: () => void;
}) {
  const addAgentNode = useStudioStore((s) => s.addAgentNode);
  const nodes = useStudioStore((s) => s.nodes);
  const setSelectedNodeId = useStudioStore((s) => s.setSelectedNodeId);
  const selectedNodeId = useStudioStore((s) => s.selectedNodeId);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-hair bg-elevated">
      <div className="border-b border-hair p-4">
        <a
          href="/"
          className="font-display text-lg tracking-tight hover:text-accent"
        >
          SynapseX
        </a>
        <p className="mt-0.5 font-mono text-[10px] tracking-widest text-faint">
          STUDIO
        </p>
      </div>

      <div className="p-4">
        <button
          onClick={() => addAgentNode()}
          className="w-full rounded-lg bg-[color:var(--color-accent)] py-2.5 text-sm font-medium text-black transition-transform hover:scale-[1.02]"
        >
          + Add agent node
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        <p className="font-mono text-[10px] tracking-widest text-faint">
          NODES ({nodes.length})
        </p>
        <div className="mt-2 space-y-1">
          {nodes.map((n) => (
            <button
              key={n.id}
              onClick={() => setSelectedNodeId(n.id)}
              className="block w-full truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors"
              style={{
                background:
                  selectedNodeId === n.id
                    ? "var(--color-accent-soft)"
                    : "transparent",
                color:
                  selectedNodeId === n.id
                    ? "var(--color-accent)"
                    : "var(--color-text-dim)",
              }}
            >
              {n.data.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-hair p-4">
        <button
          onClick={onOpenKeys}
          className="w-full rounded-lg border-hair py-2 text-sm text-dim transition-colors hover:border-[color:var(--color-accent-line)] hover:text-accent"
        >
          API keys
        </button>
      </div>
    </aside>
  );
}
