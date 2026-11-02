import { describeError } from "@/lib/providers";
import type { ToolDefinition } from "@/lib/tools";

/**
 * Runs one agent turn with native provider function-calling. The model is
 * handed the tool schemas and decides for itself whether to call any; we only
 * execute what it actually asks for and feed the result back, looping until it
 * answers in prose. Nothing is fetched pre-emptively.
 */

export type Provider = "openai" | "anthropic" | "google";

export type ToolCall = {
  tool: string;
  args: Record<string, unknown>;
  result: string;
  ok: boolean;
};

export type ToolRunResult = {
  output: string;
  toolCalls: ToolCall[];
  /** True if the model still wanted to call tools after MAX_TOOL_ROUNDS and
   *  had to be forced into one final tools-disabled round to get an answer —
   *  a visible signal that this node struggled, not a silent cascade. */
  toolsExhausted?: boolean;
};

export type HistoryExchange = { task: string; response: string };

type RunArgs = {
  provider: Provider;
  apiKey: string;
  model: string;
  systemPrompt: string;
  input: string;
  tools: ToolDefinition[];
  /** Prior exchanges for a memory-enabled node, oldest first. */
  history?: HistoryExchange[];
};

/** Guards against a model that keeps calling tools without ever answering. */
const MAX_TOOL_ROUNDS = 5;
const ANTHROPIC_MAX_TOKENS = 2048;
/** Tool output handed back to the model, capped so one page can't blow the window. */
const MAX_TOOL_RESULT_CHARS = 8_000;
/** Shown when a round produced neither a tool call nor any text. */
const FALLBACK_NO_TEXT = "(The model returned no answer.)";
/** Nudge for the forced final round once tool calls are exhausted — asks for
 *  a direct answer instead of leaving the node (and everything downstream)
 *  with nothing. */
const TOOL_EXHAUSTED_NUDGE =
  "You've used all available tool calls without reaching a final answer. " +
  "Answer the original request directly now, using only what you already " +
  "know. If you genuinely cannot answer, say so in one sentence.";
const FALLBACK_EXHAUSTED = "(No answer after using all available tool calls.)";

export async function runModelWithTools(args: RunArgs): Promise<ToolRunResult> {
  if (!args.apiKey) {
    throw new Error(
      `No API key set for ${args.provider}. Add one in Studio settings.`
    );
  }
  if (args.provider === "openai") return runOpenAi(args);
  if (args.provider === "anthropic") return runAnthropic(args);
  if (args.provider === "google") return runGoogle(args);
  throw new Error(`Unknown provider: ${args.provider}`);
}

/**
 * Executes a tool the model asked for. A tool failure is reported back to the
 * model as a tool result rather than thrown, so it can recover or explain —
 * a blocked SSRF target or a 404 should not kill the whole graph run.
 */
async function executeToolCall(
  tools: ToolDefinition[],
  name: string,
  rawArgs: unknown
): Promise<ToolCall> {
  const args =
    rawArgs && typeof rawArgs === "object"
      ? (rawArgs as Record<string, unknown>)
      : {};
  const def = tools.find((t) => t.name === name);
  if (!def) {
    return { tool: name, args, result: `Error: unknown tool "${name}"`, ok: false };
  }
  try {
    const result = await def.execute(args);
    return { tool: name, args, result: result.slice(0, MAX_TOOL_RESULT_CHARS), ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { tool: name, args, result: `Error: ${message}`, ok: false };
  }
}

function parseJsonArgs(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw !== "string" || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

// --- OpenAI --------------------------------------------------------------

async function runOpenAi({
  apiKey,
  model,
  systemPrompt,
  input,
  tools,
  history,
}: RunArgs): Promise<ToolRunResult> {
  const messages: Record<string, unknown>[] = [
    { role: "system", content: systemPrompt },
    ...(history ?? []).flatMap((h) => [
      { role: "user", content: h.task },
      { role: "assistant", content: h.response },
    ]),
    { role: "user", content: input },
  ];
  const toolCalls: ToolCall[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const body: Record<string, unknown> = { model, messages };
    if (tools.length > 0) {
      body.tools = tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
      body.tool_choice = "auto";
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await describeError(res));
    const json = await res.json();
    const message = json.choices?.[0]?.message;
    const requested = Array.isArray(message?.tool_calls) ? message.tool_calls : [];

    if (requested.length === 0) {
      return { output: message?.content || FALLBACK_NO_TEXT, toolCalls };
    }

    messages.push(message);
    for (const call of requested) {
      const executed = await executeToolCall(
        tools,
        call.function?.name ?? "",
        parseJsonArgs(call.function?.arguments)
      );
      toolCalls.push(executed);
      messages.push({ role: "tool", tool_call_id: call.id, content: executed.result });
    }
  }

  // Still wanted to call tools after MAX_TOOL_ROUNDS — force one final
  // tools-disabled round so the node ends with a real answer instead of
  // silently handing "(no response)" to everything downstream.
  messages.push({ role: "user", content: TOOL_EXHAUSTED_NUDGE });
  const finalRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages }),
  });
  if (!finalRes.ok) throw new Error(await describeError(finalRes));
  const finalJson = await finalRes.json();
  const finalText = finalJson.choices?.[0]?.message?.content;
  return { output: finalText || FALLBACK_EXHAUSTED, toolCalls, toolsExhausted: true };
}

// --- Anthropic -----------------------------------------------------------

type AnthropicBlock = {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
};

async function runAnthropic({
  apiKey,
  model,
  systemPrompt,
  input,
  tools,
  history,
}: RunArgs): Promise<ToolRunResult> {
  const messages: Record<string, unknown>[] = [
    ...(history ?? []).flatMap((h) => [
      { role: "user", content: h.task },
      { role: "assistant", content: h.response },
    ]),
    { role: "user", content: input },
  ];
  const toolCalls: ToolCall[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const body: Record<string, unknown> = {
      model,
      system: systemPrompt,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      messages,
    };
    if (tools.length > 0) {
      body.tools = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await describeError(res));
    const json = await res.json();
    const blocks: AnthropicBlock[] = Array.isArray(json.content) ? json.content : [];
    const toolUses = blocks.filter((b) => b.type === "tool_use");

    if (toolUses.length === 0) {
      const text = extractAnthropicText(blocks);
      return { output: text || FALLBACK_NO_TEXT, toolCalls };
    }

    messages.push({ role: "assistant", content: blocks });
    const results: Record<string, unknown>[] = [];
    for (const use of toolUses) {
      const executed = await executeToolCall(tools, use.name ?? "", use.input);
      toolCalls.push(executed);
      results.push({
        type: "tool_result",
        tool_use_id: use.id,
        content: executed.result,
        is_error: !executed.ok,
      });
    }
    messages.push({ role: "user", content: results });
  }

  // Still wanted to call tools after MAX_TOOL_ROUNDS — force one final
  // tools-disabled round so the node ends with a real answer instead of
  // silently handing "(no response)" to everything downstream.
  messages.push({ role: "user", content: TOOL_EXHAUSTED_NUDGE });
  const finalRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      messages,
    }),
  });
  if (!finalRes.ok) throw new Error(await describeError(finalRes));
  const finalJson = await finalRes.json();
  const finalBlocks: AnthropicBlock[] = Array.isArray(finalJson.content)
    ? finalJson.content
    : [];
  const finalText = extractAnthropicText(finalBlocks);
  return { output: finalText || FALLBACK_EXHAUSTED, toolCalls, toolsExhausted: true };
}

function extractAnthropicText(blocks: AnthropicBlock[]): string {
  return blocks
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// --- Google --------------------------------------------------------------

type GeminiPart = {
  text?: string;
  functionCall?: { name?: string; args?: unknown };
};

async function runGoogle({
  apiKey,
  model,
  systemPrompt,
  input,
  tools,
  history,
}: RunArgs): Promise<ToolRunResult> {
  const contents: Record<string, unknown>[] = [
    ...(history ?? []).flatMap((h) => [
      { role: "user", parts: [{ text: h.task }] },
      { role: "model", parts: [{ text: h.response }] },
    ]),
    { role: "user", parts: [{ text: input }] },
  ];
  const toolCalls: ToolCall[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
    };
    if (tools.length > 0) {
      body.tools = [
        {
          functionDeclarations: tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ];
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) throw new Error(await describeError(res));
    const json = await res.json();
    const parts: GeminiPart[] = json.candidates?.[0]?.content?.parts ?? [];
    const fnCalls = parts.filter((p) => p.functionCall?.name);

    if (fnCalls.length === 0) {
      const text = extractGeminiText(parts);
      return { output: text || FALLBACK_NO_TEXT, toolCalls };
    }

    contents.push({ role: "model", parts });
    const responseParts: Record<string, unknown>[] = [];
    for (const part of fnCalls) {
      const name = part.functionCall?.name ?? "";
      const executed = await executeToolCall(tools, name, part.functionCall?.args);
      toolCalls.push(executed);
      responseParts.push({
        functionResponse: { name, response: { result: executed.result } },
      });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  // Still wanted to call tools after MAX_TOOL_ROUNDS — force one final
  // tools-disabled round so the node ends with a real answer instead of
  // silently handing "(no response)" to everything downstream.
  contents.push({ role: "user", parts: [{ text: TOOL_EXHAUSTED_NUDGE }] });
  const finalRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
      }),
    }
  );
  if (!finalRes.ok) throw new Error(await describeError(finalRes));
  const finalJson = await finalRes.json();
  const finalParts: GeminiPart[] = finalJson.candidates?.[0]?.content?.parts ?? [];
  const finalText = extractGeminiText(finalParts);
  return { output: finalText || FALLBACK_EXHAUSTED, toolCalls, toolsExhausted: true };
}

function extractGeminiText(parts: GeminiPart[]): string {
  return parts
    .filter((p) => typeof p.text === "string" && p.text)
    .map((p) => p.text)
    .join("\n")
    .trim();
}
