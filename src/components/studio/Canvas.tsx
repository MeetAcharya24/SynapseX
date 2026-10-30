"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useStudioStore } from "@/lib/store";
import AgentNode from "./AgentNode";

export default function Canvas() {
  const nodes = useStudioStore((s) => s.nodes);
  const edges = useStudioStore((s) => s.edges);
  const onNodesChange = useStudioStore((s) => s.onNodesChange);
  const onEdgesChange = useStudioStore((s) => s.onEdgesChange);
  const onConnect = useStudioStore((s) => s.onConnect);
  const setSelectedNodeId = useStudioStore((s) => s.setSelectedNodeId);

  const nodeTypes = useMemo<NodeTypes>(() => ({ agent: AgentNode }), []);

  const onPaneClick = useCallback(
    () => setSelectedNodeId(null),
    [setSelectedNodeId]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="var(--color-border)"
        />
        <Controls
          showInteractive={false}
          className="!border !border-[color:var(--color-border)] !bg-[color:var(--color-bg-elevated)] [&_button]:!border-[color:var(--color-border)] [&_button]:!bg-transparent [&_button]:!fill-[color:var(--color-text)]"
        />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(10,10,11,0.75)"
          nodeColor="var(--color-accent)"
          className="!border !border-[color:var(--color-border)] !bg-[color:var(--color-bg-elevated)]"
        />
      </ReactFlow>
    </div>
  );
}
