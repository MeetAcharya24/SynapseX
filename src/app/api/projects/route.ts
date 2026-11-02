import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { handleUnexpectedError } from "@/lib/api-error";
import { validateGraph } from "@/lib/graph-limits";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await sql`
      select id, name, graph, created_at, updated_at
      from projects
      where user_id = ${session.user.id}
      order by updated_at desc
    `;
    return NextResponse.json({ projects: rows });
  } catch (err) {
    return handleUnexpectedError(err, "api/projects GET");
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const [project] = await sql`
      insert into projects (user_id, name, graph)
      values (${session.user.id}, ${name}, ${JSON.stringify(graph)})
      returning id, name, graph, created_at, updated_at
    `;

    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    return handleUnexpectedError(err, "api/projects POST");
  }
}
