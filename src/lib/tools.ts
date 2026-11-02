import dns from "node:dns/promises";
import net from "node:net";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_RETURNED_CHARS = 6_000;

export async function fetchUrlContent(rawUrl: string): Promise<string> {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported URL scheme: ${url.protocol}`);
  }
  await assertPublicHost(url.hostname);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    if (!res.ok) {
      throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    }
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_RESPONSE_BYTES) {
      throw new Error(`Response too large (${buffer.byteLength} bytes)`);
    }
    const text = Buffer.from(buffer).toString("utf-8");
    return stripToPlainText(text).slice(0, MAX_RETURNED_CHARS);
  } finally {
    clearTimeout(timeout);
  }
}

function stripToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Blocks SSRF against internal/cloud-metadata hosts before the tool fetches
// a user-supplied URL server-side.
async function assertPublicHost(hostname: string): Promise<void> {
  if (hostname === "localhost") {
    throw new Error("Refusing to fetch a localhost URL");
  }
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error(`Refusing to fetch a private/internal address: ${hostname}`);
    }
    return;
  }
  const { address } = await dns.lookup(hostname);
  if (isPrivateIp(address)) {
    throw new Error(`Refusing to fetch a private/internal address: ${hostname} (${address})`);
  }
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    );
  }
  const lower = ip.toLowerCase();
  return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
}

// --- Tool registry -------------------------------------------------------
// Tools the model can be given native function-calling access to. The LLM
// decides whether to call one; nothing here is invoked deterministically.

export type ToolDefinition = {
  /** Function name exposed to the model. */
  name: string;
  description: string;
  /** JSON Schema for the arguments, in the subset all three providers accept. */
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<string>;
};

const HTTP_FETCH: ToolDefinition = {
  name: "http_fetch",
  description:
    "Fetch a public web page or HTTP API over GET and return its content as plain text. " +
    "Use this only when the answer depends on live or external content the user supplied " +
    "a URL for, or on information you cannot know without retrieving it. Do not call it " +
    "for questions you can already answer.",
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "Absolute http(s) URL to fetch, e.g. https://example.com/page",
      },
    },
    required: ["url"],
  },
  execute: async (args) => {
    const { url } = args;
    if (typeof url !== "string" || !url.trim()) {
      throw new Error("http_fetch requires a 'url' string argument");
    }
    return fetchUrlContent(url.trim());
  },
};

/** Maps a node's `data.tools` id to its real, callable implementation. */
const TOOL_IMPLEMENTATIONS: Record<string, ToolDefinition> = {
  http: HTTP_FETCH,
};

/**
 * Resolves a node's enabled tool ids to real tool definitions. Ids with no
 * implementation yet (web_search, database, file_system) are skipped — they
 * are UI placeholders, so the model is never told about a tool it can't call.
 */
export function resolveTools(toolIds: string[]): ToolDefinition[] {
  const seen = new Set<string>();
  const resolved: ToolDefinition[] = [];
  for (const id of toolIds) {
    const def = TOOL_IMPLEMENTATIONS[id];
    if (!def || seen.has(def.name)) continue;
    seen.add(def.name);
    resolved.push(def);
  }
  return resolved;
}
