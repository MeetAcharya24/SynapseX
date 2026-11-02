import { redis } from "@/lib/redis";
import type { NodeTrace } from "@/lib/graph-executor";

export type JobStatus = "queued" | "running" | "done" | "error";

export type Job = {
  id: string;
  projectId: string;
  userId: string;
  task: string;
  status: JobStatus;
  trace: NodeTrace[];
  finalOutput?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
};

const JOB_TTL_SECONDS = 60 * 60;

function jobKey(id: string): string {
  return `job:${id}`;
}

export async function createJob(
  job: Pick<Job, "id" | "projectId" | "userId" | "task">
): Promise<Job> {
  const now = Date.now();
  const full: Job = { ...job, status: "queued", trace: [], createdAt: now, updatedAt: now };
  await redis.set(jobKey(job.id), full, { ex: JOB_TTL_SECONDS });
  return full;
}

export async function getJob(id: string): Promise<Job | null> {
  const job = await redis.get<Job>(jobKey(id));
  return job ?? null;
}

export async function updateJob(id: string, patch: Partial<Job>): Promise<void> {
  const existing = await getJob(id);
  if (!existing) return;
  const updated: Job = { ...existing, ...patch, updatedAt: Date.now() };
  await redis.set(jobKey(id), updated, { ex: JOB_TTL_SECONDS });
}

export async function appendJobStep(id: string, step: NodeTrace): Promise<void> {
  const existing = await getJob(id);
  if (!existing) return;
  const updated: Job = {
    ...existing,
    status: "running",
    trace: [...existing.trace, step],
    updatedAt: Date.now(),
  };
  await redis.set(jobKey(id), updated, { ex: JOB_TTL_SECONDS });
}
