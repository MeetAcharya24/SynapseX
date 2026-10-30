"use client";

import {
  useStudioStore,
  MODELS,
  AVAILABLE_TOOLS,
  type Provider,
} from "@/lib/store";

export default function ConfigPanel() {
  const selectedNodeId = useStudioStore((s) => s.selectedNodeId);
  const nodes = useStudioStore((s) => s.nodes);
  const updateNodeData = useStudioStore((s) => s.updateNodeData);
  const deleteNode = useStudioStore((s) => s.deleteNode);

  const node = nodes.find((n) => n.id === selectedNodeId);

  if (!node) {
    return (
      <aside className="flex h-full w-80 flex-col items-center justify-center border-l border-hair bg-elevated px-6 text-center">
        <p className="text-sm text-faint">
          Select a node to configure it, or add a new agent from the
          sidebar.
        </p>
      </aside>
    );
  }

  const { data } = node;

  return (
    <aside className="h-full w-80 overflow-y-auto border-l border-hair bg-elevated p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] tracking-widest text-faint">
          NODE SETTINGS
        </p>
        <button
          onClick={() => deleteNode(node.id)}
          className="font-mono text-[10px] text-faint hover:text-accent"
        >
          DELETE
        </button>
      </div>

      <label className="mt-4 block">
        <span className="text-xs text-faint">Label</span>
        <input
          value={data.label}
          onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
          className="mt-1 w-full rounded-lg border-hair bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--color-accent-line)]"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-xs text-faint">Provider</span>
        <select
          value={data.provider}
          onChange={(e) => {
            const provider = e.target.value as Provider;
            updateNodeData(node.id, {
              provider,
              model: MODELS[provider][0].id,
            });
          }}
          className="mt-1 w-full rounded-lg border-hair bg-[color:var(--color-bg)] px-3 py-2 text-sm outline-none"
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="google">Google</option>
        </select>
      </label>

      <label className="mt-4 block">
        <span className="text-xs text-faint">Model</span>
        <select
          value={data.model}
          onChange={(e) => updateNodeData(node.id, { model: e.target.value })}
          className="mt-1 w-full rounded-lg border-hair bg-[color:var(--color-bg)] px-3 py-2 text-sm outline-none"
        >
          {MODELS[data.provider].map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-4 block">
        <span className="text-xs text-faint">System prompt</span>
        <textarea
          value={data.systemPrompt}
          onChange={(e) =>
            updateNodeData(node.id, { systemPrompt: e.target.value })
          }
          rows={4}
          className="mt-1 w-full resize-none rounded-lg border-hair bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--color-accent-line)]"
        />
      </label>

      <div className="mt-4">
        <span className="text-xs text-faint">Tools</span>
        <div className="mt-2 space-y-1.5">
          {AVAILABLE_TOOLS.map((tool) => {
            const checked = data.tools.includes(tool.id);
            return (
              <label
                key={tool.id}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    updateNodeData(node.id, {
                      tools: checked
                        ? data.tools.filter((t) => t !== tool.id)
                        : [...data.tools, tool.id],
                    })
                  }
                  className="accent-[color:var(--color-accent)]"
                />
                {tool.label}
              </label>
            );
          })}
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={data.memory}
          onChange={(e) =>
            updateNodeData(node.id, { memory: e.target.checked })
          }
          className="accent-[color:var(--color-accent)]"
        />
        Give this agent memory
      </label>
    </aside>
  );
}
