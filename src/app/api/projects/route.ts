import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await sql`
    select id, name, graph, created_at, updated_at
    from projects
    where user_id = ${session.user.id}
    order by updated_at desc
  `;
  return NextResponse.json({ projects: rows });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, graph } = body;

    if (!name || !graph) {
      return NextResponse.json(
        { error: "Missing name or graph" },
        { status: 400 }
      );
    }

    const [project] = await sql`
      insert into projects (user_id, name, graph)
      values (${session.user.id}, ${name}, ${JSON.stringify(graph)})
      returning id, name, graph, created_at, updated_at
    `;

    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
