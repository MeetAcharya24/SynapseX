import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { runModelWithTools, type ToolCall } from "@/lib/tool-loop";
import { resolveTools } from "@/lib/tools";

type Provider = "openai" | "anthropic" | "google";
const PROVIDERS = new Set<Provider>(["openai", "anthropic", "google"]);

export type ProjectNode = {
  id: string;
  data: {
    provider: Provider;
    model: string;
    systemPrompt: string;
    tools: string[];
  };
};

export type ProjectEdge = { source: string; target: string };

export type NodeTrace = {
  nodeId: string;
  input: string;
  output: string;
  /** Tools the model chose to call on this node, in call order. Empty if it
   *  decided it didn't need any — which is itself the interesting signal. */
  toolCalls: ToolCall[];
};

// Loaded from the `projects.graph` jsonb column, so shape isn't guaranteed —
// validate at this boundary rather than trusting stored data.
export function parseProjectNodes(raw: unknown[]): ProjectNode[] {
  const nodes: ProjectNode[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { id, data } = item as Record<string, unknown>;
    if (typeof id !== "string" || !data || typeof data !== "object") continue;
    const { provider, model, systemPrompt, tools } = data as Record<string, unknown>;
    if (!PROVIDERS.has(provider as Provider) || typeof model !== "string") continue;
    nodes.push({
      id,
      data: {
        provider: provider as Provider,
        model,
        systemPrompt: typeof systemPrompt === "string" ? systemPrompt : "",
        tools: Array.isArray(tools) ? tools.filter((t): t is string => typeof t === "string") : [],
      },
    });
  }
  return nodes;
}

export function parseProjectEdges(raw: unknown[]): ProjectEdge[] {
  const edges: ProjectEdge[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { source, target } = item as Record<string, unknown>;
    if (typeof source === "string" && typeof target === "string") {
      edges.push({ source, target });
    }
  }
  return edges;
}

type ExecState = { task: string; outputs: Record<string, string> };

const ExecAnnotation = Annotation.Root({
  task: Annotation<string>,
  outputs: Annotation<Record<string, string>>({
    reducer: (left, right) => ({ ...left, ...right }),
    default: () => ({}),
  }),
});

export async function runProjectGraph({
  nodes,
  edges,
  task,
  apiKeys,
}: {
  nodes: ProjectNode[];
  edges: ProjectEdge[];
  task: string;
  apiKeys: Partial<Record<Provider, string>>;
}): Promise<{ outputs: Record<string, string>; trace: NodeTrace[]; finalOutput: string }> {
  if (nodes.length === 0) {
    throw new Error("Project has no agent nodes");
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const validEdges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

  const predecessors = new Map<string, string[]>();
  const successors = new Map<string, string[]>();
  for (const n of nodes) {
    predecessors.set(n.id, []);
    successors.set(n.id, []);
  }
  for (const e of validEdges) {
    predecessors.get(e.target)?.push(e.source);
    successors.get(e.source)?.push(e.target);
  }

  const roots = nodes.filter((n) => predecessors.get(n.id)?.length === 0);
  const leaves = nodes.filter((n) => successors.get(n.id)?.length === 0);
  if (roots.length === 0) {
    throw new Error("Graph has no root node to start from — check for a cycle");
  }

  const trace: NodeTrace[] = [];

  // `any`: StateGraph's chained generics assume node keys are known string
  // literals at compile time, which doesn't fit a graph built from a
  // dynamic, user-authored node list.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let graph: any = new StateGraph(ExecAnnotation);

  for (const node of nodes) {
    const preds = predecessors.get(node.id) ?? [];
    graph = graph.addNode(node.id, async (state: ExecState) => {
      const input =
        preds.length > 0
          ? preds.map((p) => state.outputs[p]).filter(Boolean).join("\n\n---\n\n")
          : state.task;

      // The node's enabled tools are offered to the model as real callable
      // functions; whether any of them run is the model's decision, not ours.
      const { output, toolCalls } = await runModelWithTools({
        provider: node.data.provider,
        apiKey: apiKeys[node.data.provider] ?? "",
        model: node.data.model,
        systemPrompt: node.data.systemPrompt,
        input,
        tools: await resolveTools(node.data.tools),
      });

      trace.push({ nodeId: node.id, input, output, toolCalls });
      return { outputs: { [node.id]: output } };
    });
  }

  for (const r of roots) graph = graph.addEdge(START, r.id);
  for (const e of validEdges) graph = graph.addEdge(e.source, e.target);
  for (const l of leaves) graph = graph.addEdge(l.id, END);

  const compiled = graph.compile();
  const result = await compiled.invoke({ task, outputs: {} });

  const finalOutput = leaves
    .map((l) => result.outputs[l.id])
    .filter(Boolean)
    .join("\n\n");

  return { outputs: result.outputs, trace, finalOutput };
}
