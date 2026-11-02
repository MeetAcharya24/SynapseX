"use client";

import { useRef, useState } from "react";
import { useStudioStore } from "@/lib/store";
import { useSession } from "@/lib/auth-client";

type TraceToolCall = {
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
};

type Step = {
  nodeId: string;
  label: string;
  output: string;
  toolCalls: TraceToolCall[];
  toolsExhausted: boolean;
};

const MAX_ARG_CHARS = 60;

function formatToolArgs(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([key, value]) => {
      const text = typeof value === "string" ? value : JSON.stringify(value);
      const shown =
        text.length > MAX_ARG_CHARS ? `${text.slice(0, MAX_ARG_CHARS)}…` : text;
      return `${key}: ${shown}`;
    })
    .join(", ");
}

export default function Playground() {
  const nodes = useStudioStore((s) => s.nodes);
  const apiKeys = useStudioStore((s) => s.apiKeys);
  const currentProjectId = useStudioStore((s) => s.currentProjectId);
  const currentProjectName = useStudioStore((s) => s.currentProjectName);
  const isDirty = useStudioStore((s) => s.isDirty);
  const saveProject = useStudioStore((s) => s.saveProject);

  const { data: session } = useSession();

  const [task, setTask] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const usedProviders = Array.from(new Set(nodes.map((n) => n.data.provider)));
  const missingKeys = usedProviders.filter((p) => !apiKeys[p]);

  type TraceStep = {
    nodeId: string;
    input: string;
    output: string;
    toolCalls?: TraceToolCall[];
    toolsExhausted?: boolean;
  };

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function applyTrace(trace: TraceStep[]) {
    setSteps(
      trace.map((t) => ({
        nodeId: t.nodeId,
        label: nodes.find((n) => n.id === t.nodeId)?.data.label ?? t.nodeId,
        output: t.output,
        toolCalls: t.toolCalls ?? [],
        toolsExhausted: t.toolsExhausted ?? false,
      }))
    );
  }

  function pollJob(jobId: string) {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/execute/${jobId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Request failed");

        const job: {
          status: "queued" | "running" | "done" | "error";
          trace: TraceStep[];
          error?: string;
        } = json.job;

        applyTrace(job.trace);

        if (job.status === "queued") {
          setStatus("Queued...");
        } else if (job.status === "running") {
          setStatus("Running...");
        } else if (job.status === "done") {
          setStatus(null);
          setRunning(false);
          stopPolling();
        } else if (job.status === "error") {
          setError(job.error ?? "Run failed");
          setStatus(null);
          setRunning(false);
          stopPolling();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setStatus(null);
        setRunning(false);
        stopPolling();
      }
    }, 1200);
  }

  async function run() {
    if (!task.trim() || running) return;
    stopPolling();
    setRunning(true);
    setError(null);
    setSteps([]);
    setStatus(null);

    try {
      let projectId = currentProjectId;
      if (!projectId || isDirty) {
        setStatus("Saving project...");
        const result = await saveProject(currentProjectName ?? undefined);
        if ("error" in result) {
          setError(result.error);
          setRunning(false);
          return;
        }
        projectId = result.id;
      }

      setStatus("Queued...");
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, task, apiKeys }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");

      pollJob(json.jobId as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStatus(null);
      setRunning(false);
    }
  }

  return (
    <div className="flex h-56 flex-col border-t border-hair">
      <div className="flex items-center justify-between border-b border-hair px-4 py-2">
        <p className="font-mono text-[10px] tracking-widest text-faint">
          PLAYGROUND · {(currentProjectName ?? "UNSAVED PROJECT").toUpperCase()}
        </p>
        {missingKeys.length > 0 && (
          <span className="font-mono text-[10px] text-accent">
            no {missingKeys.join(", ")} key set
          </span>
        )}
      </div>

      {!session ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p className="text-sm text-faint">
            Sign in to run this project — execution needs a saved cloud
            project.
          </p>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {steps.length === 0 && !status && (
              <p className="text-sm text-faint">No run yet.</p>
            )}
            {status && <p className="text-sm text-faint">{status}</p>}
            {steps.map((step, i) => (
              <div key={`${step.nodeId}-${i}`} className="text-sm">
                <span
                  className="font-mono text-[10px]"
                  style={{ color: "var(--color-accent)" }}
                >
                  STEP {i + 1} · {step.label.toUpperCase()}
                </span>
                {step.toolCalls.map((call, j) => (
                  <p
                    key={`${call.tool}-${j}`}
                    className="font-mono text-[10px] text-faint"
                  >
                    {call.ok ? "↳ called" : "↳ failed"} {call.tool}(
                    {formatToolArgs(call.args)})
                  </p>
                ))}
                {step.toolsExhausted && (
                  <p className="font-mono text-[10px] text-amber-400">
                    ⚠ ran out of tool-call attempts — answered from general
                    knowledge
                  </p>
                )}
                <p className="whitespace-pre-wrap text-dim">{step.output}</p>
              </div>
            ))}
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          <div className="flex gap-2 border-t border-hair p-3">
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
              placeholder="Send a task to run through the graph…"
              className="flex-1 rounded-lg border-hair bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--color-accent-line)]"
            />
            <button
              onClick={run}
              disabled={running || !task.trim()}
              className="rounded-lg bg-[color:var(--color-accent)] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {running ? "…" : "Run"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
