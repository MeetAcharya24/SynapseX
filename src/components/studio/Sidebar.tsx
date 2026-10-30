"use client";

import { useEffect, useState } from "react";
import { useStudioStore } from "@/lib/store";
import { useSession, signIn, signOut } from "@/lib/auth-client";

type CloudProject = { id: string; name: string; updated_at: string };

export default function Sidebar({
  onOpenKeys,
}: {
  onOpenKeys: () => void;
}) {
  const addAgentNode = useStudioStore((s) => s.addAgentNode);
  const nodes = useStudioStore((s) => s.nodes);
  const edges = useStudioStore((s) => s.edges);
  const setSelectedNodeId = useStudioStore((s) => s.setSelectedNodeId);
  const selectedNodeId = useStudioStore((s) => s.selectedNodeId);
  const loadGraph = useStudioStore((s) => s.loadGraph);
  const newProjectGraph = useStudioStore((s) => s.newProject);
  const saveProject = useStudioStore((s) => s.saveProject);
  const clearProjectBinding = useStudioStore((s) => s.clearProjectBinding);
  const currentProjectId = useStudioStore((s) => s.currentProjectId);
  const currentProjectName = useStudioStore((s) => s.currentProjectName);

  const { data: session, isPending: sessionLoading } = useSession();

  const [projects, setProjects] = useState<CloudProject[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("Untitled project");

  const loadProjects = async () => {
    const res = await fetch("/api/projects");
    if (!res.ok) return;
    const data = await res.json();
    setProjects(data.projects ?? []);
  };

  useEffect(() => {
    if (session) {
      loadProjects();
      return;
    }
    setProjects([]);
    // Only once the session has actually resolved — while it's still pending
    // we'd wipe the binding restored from localStorage on every page load.
    if (!sessionLoading) {
      clearProjectBinding();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, sessionLoading]);

  const handleNewProject = () => {
    newProjectGraph();
    setDraftName("Untitled project");
    setStatus(null);
  };

  const handleSave = async () => {
    if (!session) return;

    setStatus("Saving...");
    const result = await saveProject(draftName);
    if ("error" in result) {
      setStatus(result.error);
      return;
    }
    setStatus(`Saved "${result.name}"`);
    loadProjects();
  };

  const handleOpen = async (id: string) => {
    const res = await fetch(`/api/projects/${id}`);
    if (!res.ok) {
      setStatus("Load failed");
      return;
    }
    const { project } = await res.json();
    loadGraph(project.graph.nodes, project.graph.edges, {
      id: project.id,
      name: project.name,
    });
    setStatus(`Loaded "${project.name}"`);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setStatus("Delete failed");
      return;
    }
    if (id === currentProjectId) {
      handleNewProject();
    }
    loadProjects();
  };

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

      <div className="border-t border-hair p-4 space-y-2">
        <p className="font-mono text-[10px] tracking-widest text-faint">
          PROJECTS
        </p>
        {!session ? (
          <p className="text-xs text-faint">
            Sign in to save projects to the cloud. You can keep building
            locally either way.
          </p>
        ) : (
          <>
            {!currentProjectId && (
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Project name"
                className="w-full rounded-lg border-hair bg-transparent px-2 py-1.5 text-xs text-dim outline-none focus:border-[color:var(--color-accent-line)]"
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={handleNewProject}
                className="flex-1 rounded-lg border-hair py-2 text-sm text-dim transition-colors hover:border-[color:var(--color-accent-line)] hover:text-accent"
              >
                New
              </button>
              <button
                onClick={handleSave}
                className="flex-1 rounded-lg border-hair py-2 text-sm text-dim transition-colors hover:border-[color:var(--color-accent-line)] hover:text-accent"
              >
                Save
              </button>
            </div>
            {currentProjectName && (
              <p className="truncate text-xs text-dim">
                Editing: {currentProjectName}
              </p>
            )}
            {status && <p className="text-xs text-faint">{status}</p>}
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {projects.length === 0 && (
                <p className="text-xs text-faint">No saved projects yet.</p>
              )}
              {projects.map((p) => (
                <div key={p.id} className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpen(p.id)}
                    className="flex-1 truncate rounded-md px-2 py-1 text-left text-xs transition-colors"
                    style={{
                      color:
                        p.id === currentProjectId
                          ? "var(--color-accent)"
                          : "var(--color-text-dim)",
                    }}
                  >
                    {p.name}
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="shrink-0 px-1 text-xs text-faint hover:text-accent"
                    aria-label={`Delete ${p.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="border-t border-hair p-4 space-y-2">
        <p className="font-mono text-[10px] tracking-widest text-faint">
          ACCOUNT
        </p>
        {sessionLoading ? (
          <p className="text-xs text-faint">Loading...</p>
        ) : session ? (
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-dim">
              {session.user.name ?? session.user.email}
            </span>
            <button
              onClick={() => signOut()}
              className="shrink-0 rounded-lg border-hair px-2 py-1 text-xs text-dim transition-colors hover:border-[color:var(--color-accent-line)] hover:text-accent"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={() =>
              signIn.social({ provider: "github", callbackURL: "/studio" })
            }
            className="w-full rounded-lg border-hair py-2 text-sm text-dim transition-colors hover:border-[color:var(--color-accent-line)] hover:text-accent"
          >
            Sign in with GitHub
          </button>
        )}
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
