import { sql } from "@/lib/db";
import {
  runProjectGraph,
  type ProjectEdge,
  type ProjectNode,
} from "@/lib/graph-executor";
import { appendJobStep, updateJob } from "@/lib/jobs";

type Provider = "openai" | "anthropic" | "google";

export async function runProjectJob({
  jobId,
  projectId,
  userId,
  task,
  nodes,
  edges,
  apiKeys,
}: {
  jobId: string;
  projectId: string;
  userId: string;
  task: string;
  nodes: ProjectNode[];
  edges: ProjectEdge[];
  apiKeys: Partial<Record<Provider, string>>;
}): Promise<void> {
  await updateJob(jobId, { status: "running" });

  try {
    const result = await runProjectGraph({
      nodes,
      edges,
      task,
      apiKeys,
      onStep: (step) => appendJobStep(jobId, step),
    });

    await updateJob(jobId, {
      status: "done",
      trace: result.trace,
      finalOutput: result.finalOutput,
    });

    await sql`
      insert into runs (id, project_id, user_id, task, status, trace, final_output, finished_at)
      values (
        ${jobId}, ${projectId}, ${userId}, ${task}, 'done',
        ${JSON.stringify(result.trace)}, ${result.finalOutput}, now()
      )
    `;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await updateJob(jobId, { status: "error", error: message });

    await sql`
      insert into runs (id, project_id, user_id, task, status, trace, error, finished_at)
      values (
        ${jobId}, ${projectId}, ${userId}, ${task}, 'error',
        '[]'::jsonb, ${message}, now()
      )
    `;
  }
}
