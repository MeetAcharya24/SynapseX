import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleUnexpectedError } from "@/lib/api-error";
import { getJob } from "@/lib/jobs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;

  try {
    const job = await getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (job.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ job });
  } catch (err) {
    return handleUnexpectedError(err, "api/execute/[jobId] GET");
  }
}
