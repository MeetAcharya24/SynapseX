import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { handleUnexpectedError } from "@/lib/api-error";
import { validateGraph } from "@/lib/graph-limits";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const [project] = await sql`
      select id, user_id, name, graph, created_at, updated_at
      from projects
      where id = ${id}
    `;

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (project.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { user_id: _user_id, ...rest } = project;
    return NextResponse.json({ project: rest });
  } catch (err) {
    return handleUnexpectedError(err, "api/projects/[id] GET");
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { name?: unknown; graph?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, graph } = body;
  if (!name || !graph) {
    return NextResponse.json(
      { error: "Missing name or graph" },
      { status: 400 }
    );
  }

  const graphError = validateGraph(graph);
  if (graphError) {
    return NextResponse.json(graphError, { status: 400 });
  }

  try {
    const [existing] = await sql`
      select user_id from projects where id = ${id}
    `;
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [project] = await sql`
      update projects
      set name = ${name}, graph = ${JSON.stringify(graph)}, updated_at = now()
      where id = ${id}
      returning id, name, graph, created_at, updated_at
    `;

    return NextResponse.json({ project });
  } catch (err) {
    return handleUnexpectedError(err, "api/projects/[id] PUT");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const [existing] = await sql`
      select user_id from projects where id = ${id}
    `;
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await sql`delete from projects where id = ${id}`;

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleUnexpectedError(err, "api/projects/[id] DELETE");
  }
}
