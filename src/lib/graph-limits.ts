/**
 * Hard ceiling on a saved project's graph size. Keeps a single pathological
 * canvas (or a scripted abuse case) from producing a StateGraph with
 * hundreds of nodes that then chews server resources on every run.
 */
export const MAX_GRAPH_NODES = 20;

export function validateGraph(graph: unknown): { error: string } | null {
  if (!graph || typeof graph !== "object") {
    return { error: "Graph must be an object with nodes and edges" };
  }
  const nodes = (graph as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodes)) {
    return { error: "Graph must include a nodes array" };
  }
  if (nodes.length > MAX_GRAPH_NODES) {
    return {
      error: `Project has ${nodes.length} nodes, which exceeds the maximum of ${MAX_GRAPH_NODES}. Remove some nodes before saving.`,
    };
  }
  return null;
}
