import { NextResponse } from "next/server";

/**
 * Logs the real error server-side (stack and all) and returns a generic,
 * safe message to the client. Use this for anything unexpected — a DB
 * connection drop, a Redis timeout — never for errors we raised ourselves
 * with an already user-safe message (missing field, 403, etc).
 */
export function handleUnexpectedError(err: unknown, context: string): NextResponse {
  console.error(`[${context}]`, err);
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 }
  );
}
