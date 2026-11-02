import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { parseProjectEdges, parseProjectNodes } from "@/lib/graph-executor";
import { createJob } from "@/lib/jobs";
import { runProjectJob } from "@/lib/job-runner";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { projectId?: unknown; task?: unknown; apiKeys?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { projectId, task, apiKeys } = body;
  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }
  if (typeof task !== "string" || !task) {
    return NextResponse.json({ error: "Missing task" }, { status: 400 });
  }

  const [project] = await sql`
    select user_id, graph from projects where id = ${projectId}
  `;
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (project.user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const graph = project.graph as { nodes?: unknown[]; edges?: unknown[] };
  const nodes = parseProjectNodes(Array.isArray(graph.nodes) ? graph.nodes : []);
  const edges = parseProjectEdges(Array.isArray(graph.edges) ? graph.edges : []);
  const resolvedApiKeys = apiKeys && typeof apiKeys === "object" ? apiKeys : {};

  const jobId = crypto.randomUUID();
  const userId = session.user.id;

  await createJob({ id: jobId, projectId, userId, task });

  after(() =>
    runProjectJob({ jobId, projectId, userId, task, nodes, edges, apiKeys: resolvedApiKeys })
  );

  return NextResponse.json({ jobId }, { status: 202 });
}
