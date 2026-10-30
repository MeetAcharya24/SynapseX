"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import { nanoid } from "nanoid";

export type Provider = "openai" | "anthropic" | "google";

export const MODELS: Record<Provider, { id: string; label: string }[]> = {
  openai: [
    { id: "gpt-4.1", label: "GPT-4.1" },
    { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
    { id: "o4-mini", label: "o4-mini" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
    { id: "claude-opus-4-1-20250805", label: "Claude Opus 4.1" },
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  ],
  google: [
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  ],
};

export const AVAILABLE_TOOLS = [
  { id: "web_search", label: "Web search" },
  { id: "database", label: "Database query" },
  { id: "http", label: "HTTP / API call" },
  { id: "file_system", label: "File read/write" },
];

export type AgentNodeData = {
  label: string;
  provider: Provider;
  model: string;
  systemPrompt: string;
  tools: string[];
  memory: boolean;
  [key: string]: unknown;
};

export type AgentNode = Node<AgentNodeData, "agent">;

type ApiKeys = Partial<Record<Provider, string>>;

type StudioState = {
  nodes: AgentNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  apiKeys: ApiKeys;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addAgentNode: (position?: { x: number; y: number }) => void;
  updateNodeData: (id: string, data: Partial<AgentNodeData>) => void;
  deleteNode: (id: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  setApiKey: (provider: Provider, key: string) => void;
};

const defaultNode = (position: { x: number; y: number }): AgentNode => ({
  id: nanoid(8),
  type: "agent",
  position,
  data: {
    label: "New Agent",
    provider: "anthropic",
    model: MODELS.anthropic[0].id,
    systemPrompt: "You are a helpful assistant.",
    tools: [],
    memory: false,
  },
});

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      nodes: [defaultNode({ x: 240, y: 160 })],
      edges: [],
      selectedNodeId: null,
      apiKeys: {},

      onNodesChange: (changes) =>
        set({ nodes: applyNodeChanges(changes, get().nodes) as AgentNode[] }),

      onEdgesChange: (changes) =>
        set({ edges: applyEdgeChanges(changes, get().edges) }),

      onConnect: (connection) =>
        set({ edges: addEdge(connection, get().edges) }),

      addAgentNode: (position) =>
        set({
          nodes: [
            ...get().nodes,
            defaultNode(
              position ?? {
                x: 200 + Math.random() * 300,
                y: 120 + Math.random() * 300,
              }
            ),
          ],
        }),

      updateNodeData: (id, data) =>
        set({
          nodes: get().nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...data } } : n
          ),
        }),

      deleteNode: (id) =>
        set({
          nodes: get().nodes.filter((n) => n.id !== id),
          edges: get().edges.filter((e) => e.source !== id && e.target !== id),
          selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
        }),

      setSelectedNodeId: (id) => set({ selectedNodeId: id }),

      setApiKey: (provider, key) =>
        set({ apiKeys: { ...get().apiKeys, [provider]: key } }),
    }),
    {
      name: "synapsex-studio",
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        apiKeys: state.apiKeys,
      }),
    }
  )
);
