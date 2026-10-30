import { NextRequest, NextResponse } from "next/server";
import { runModel } from "@/lib/providers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, apiKey, model, systemPrompt, messages } = body;

    if (!provider || !model) {
      return NextResponse.json(
        { error: "Missing provider or model" },
        { status: 400 }
      );
    }

    const text = await runModel({
      provider,
      apiKey,
      model,
      systemPrompt: systemPrompt ?? "",
      messages: messages ?? [],
    });

    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
