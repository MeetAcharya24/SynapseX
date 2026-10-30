"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useStudioStore, type AgentNode as AgentNodeType } from "@/lib/store";

const providerLabel: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
};

export default function AgentNode({
  id,
  data,
  selected,
}: NodeProps<AgentNodeType>) {
  const setSelectedNodeId = useStudioStore((s) => s.setSelectedNodeId);

  return (
    <div
      onClick={() => setSelectedNodeId(id)}
      className="w-64 cursor-pointer rounded-xl border bg-elevated px-4 py-3 shadow-lg transition-colors"
      style={{
        borderColor: selected
          ? "var(--color-accent)"
          : "var(--color-border)",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-0"
        style={{ background: "var(--color-accent)" }}
      />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-widest text-faint">
          AGENT
        </span>
        <span className="font-mono text-[10px] text-accent">
          {providerLabel[data.provider]}
        </span>
      </div>
      <p className="mt-1 font-display text-lg tracking-tight">{data.label}</p>
      <p className="mt-1 truncate text-xs text-dim">{data.model}</p>
      {data.tools.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {data.tools.map((t) => (
            <span
              key={t}
              className="rounded-full border-hair px-2 py-0.5 font-mono text-[9px] text-faint"
            >
              {t}
            </span>
          ))}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-0"
        style={{ background: "var(--color-accent)" }}
      />
    </div>
  );
}
