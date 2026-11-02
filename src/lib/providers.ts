export type ChatMessage = { role: "user" | "assistant"; content: string };

type RunArgs = {
  provider: "openai" | "anthropic" | "google";
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: ChatMessage[];
};

export async function runModel({
  provider,
  apiKey,
  model,
  systemPrompt,
  messages,
}: RunArgs): Promise<string> {
  if (!apiKey) {
    throw new Error(
      `No API key set for ${provider}. Add one in Studio settings.`
    );
  }

  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });
    if (!res.ok) throw new Error(await describeError(res));
    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? "(no response)";
  }

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        max_tokens: 1024,
        messages,
      }),
    });
    if (!res.ok) throw new Error(await describeError(res));
    const json = await res.json();
    return json.content?.[0]?.text ?? "(no response)";
  }

  if (provider === "google") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
        }),
      }
    );
    if (!res.ok) throw new Error(await describeError(res));
    const json = await res.json();
    return (
      json.candidates?.[0]?.content?.parts?.[0]?.text ?? "(no response)"
    );
  }

  throw new Error(`Unknown provider: ${provider}`);
}

export async function describeError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    const msg =
      body?.error?.message || body?.message || JSON.stringify(body);
    return `${res.status} ${res.statusText}: ${msg}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}
