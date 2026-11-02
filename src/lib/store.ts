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
  // Gemini 2.5 models are no longer available to new API keys (retired Oct
  // 2026). Flash Lite leads because free-tier keys get `limit: 0` on Pro, so
  // defaulting to Pro makes a BYOK user's first run fail with a 429.
  google: [
    { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite" },
    { id: "gemini-3-flash-preview", label: "Gemini 3 Flash" },
    { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
  ],
};

export const AVAILABLE_TOOLS = [
  { id: "web_search", label: "Web search" },
  { id: "database", label: "Database query" },
  { id: "http", label: "HTTP / API call" },
  { id: "file_system", label: "File read/write" },
  { id: "mcp_demo", label: "MCP demo tools" },
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

type SavedProject = { id: string; name: string };

type StudioState = {
  nodes: AgentNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  apiKeys: ApiKeys;
  currentProjectId: string | null;
  currentProjectName: string | null;
  isDirty: boolean;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addAgentNode: (position?: { x: number; y: number }) => void;
  updateNodeData: (id: string, data: Partial<AgentNodeData>) => void;
  deleteNode: (id: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  setApiKey: (provider: Provider, key: string) => void;
  loadGraph: (
    nodes: AgentNode[],
    edges: Edge[],
    project?: SavedProject | null
  ) => void;
  newProject: () => void;
  clearProjectBinding: () => void;
  saveProject: (name?: string) => Promise<SavedProject | { error: string }>;
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
      currentProjectId: null,
      currentProjectName: null,
      isDirty: false,

      onNodesChange: (changes) =>
        set({
          nodes: applyNodeChanges(changes, get().nodes) as AgentNode[],
          isDirty: true,
        }),

      onEdgesChange: (changes) =>
        set({ edges: applyEdgeChanges(changes, get().edges), isDirty: true }),

      onConnect: (connection) =>
        set({ edges: addEdge(connection, get().edges), isDirty: true }),

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
          isDirty: true,
        }),

      updateNodeData: (id, data) =>
        set({
          nodes: get().nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...data } } : n
          ),
          isDirty: true,
        }),

      deleteNode: (id) =>
        set({
          nodes: get().nodes.filter((n) => n.id !== id),
          edges: get().edges.filter((e) => e.source !== id && e.target !== id),
          selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
          isDirty: true,
        }),

      setSelectedNodeId: (id) => set({ selectedNodeId: id }),

      setApiKey: (provider, key) =>
        set({ apiKeys: { ...get().apiKeys, [provider]: key } }),

      loadGraph: (nodes, edges, project) =>
        set({
          nodes,
          edges,
          selectedNodeId: null,
          currentProjectId: project?.id ?? null,
          currentProjectName: project?.name ?? null,
          isDirty: false,
        }),

      newProject: () =>
        set({
          nodes: [defaultNode({ x: 240, y: 160 })],
          edges: [],
          selectedNodeId: null,
          currentProjectId: null,
          currentProjectName: null,
          isDirty: false,
        }),

      // Drops the cloud binding but keeps the canvas: a signed-out user still
      // gets the full local experience, and a different user signing in next
      // must not inherit a project id they don't own.
      clearProjectBinding: () =>
        set({ currentProjectId: null, currentProjectName: null }),

      saveProject: async (name) => {
        const { nodes, edges, currentProjectId, currentProjectName } = get();
        const finalName = currentProjectId
          ? currentProjectName ?? "Untitled project"
          : name?.trim() || "Untitled project";

        const res = currentProjectId
          ? await fetch(`/api/projects/${currentProjectId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: finalName, graph: { nodes, edges } }),
            })
          : await fetch("/api/projects", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: finalName, graph: { nodes, edges } }),
            });

        if (!res.ok) {
          return { error: "Save failed" };
        }

        const { project } = await res.json();
        set({
          currentProjectId: project.id,
          currentProjectName: project.name,
          isDirty: false,
        });
        return { id: project.id, name: project.name };
      },
    }),
    {
      name: "synapsex-studio",
      // The project binding and dirty flag persist alongside the canvas:
      // without the id a reload-then-Run saves a duplicate project, and
      // without isDirty it would run the stale server-side graph instead of
      // the edits sitting in localStorage.
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        apiKeys: state.apiKeys,
        currentProjectId: state.currentProjectId,
        currentProjectName: state.currentProjectName,
        isDirty: state.isDirty,
      }),
    }
  )
);
