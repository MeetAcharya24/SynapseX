import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { ToolDefinition } from "@/lib/tools";

/**
 * Connects to the reference MCP "everything" demo server (spawned via npx,
 * no account/auth needed) over stdio and exposes its tools through the same
 * ToolDefinition shape as our other tools, so runModelWithTools() calls an
 * MCP tool exactly like it calls http_fetch. One child process + client
 * connection is reused for the life of this module — this wires up the real
 * MCP client protocol for a known demo server; a UI for arbitrary external
 * servers is still out of scope.
 */

const MCP_DEMO_COMMAND = "npx";
const MCP_DEMO_ARGS = ["-y", "@modelcontextprotocol/server-everything"];
const MAX_MCP_RESULT_CHARS = 8_000;

let clientPromise: Promise<Client> | null = null;

async function getMcpClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = connect().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

async function connect(): Promise<Client> {
  const transport = new StdioClientTransport({
    command: MCP_DEMO_COMMAND,
    args: MCP_DEMO_ARGS,
  });
  const client = new Client({ name: "synapsex-studio", version: "0.1.0" });
  await client.connect(transport);
  return client;
}

/**
 * Provider function-calling schemas (Gemini in particular) accept only a
 * narrow subset of JSON Schema. MCP servers are free to emit full draft
 * 2020-12 metadata ($schema, additionalProperties) and vendor extensions
 * (x-*) in their inputSchema, which Gemini rejects outright as unknown
 * fields. Strip those recursively so any MCP tool's schema is portable
 * across all three providers, not just this demo server's.
 */
const UNSUPPORTED_SCHEMA_KEYS = new Set(["$schema", "$id", "additionalProperties"]);

function sanitizeSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(sanitizeSchema);
  if (!schema || typeof schema !== "object") return schema;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (UNSUPPORTED_SCHEMA_KEYS.has(key) || key.startsWith("x-")) continue;
    result[key] = sanitizeSchema(value);
  }
  return result;
}

function contentToText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((block) => {
      if (block && typeof block === "object" && (block as { type?: string }).type === "text") {
        return (block as { text?: string }).text ?? "";
      }
      return JSON.stringify(block);
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * Lists the demo server's tools over MCP and wraps each as a ToolDefinition
 * that calls it over the real protocol (tools/list, then tools/call per
 * invocation) rather than anything hardcoded about what the server offers.
 */
export async function getMcpDemoTools(): Promise<ToolDefinition[]> {
  const client = await getMcpClient();
  const { tools } = await client.listTools();
  return tools.map((tool) => ({
    name: `mcp_${tool.name}`,
    description:
      tool.description ?? `Tool "${tool.name}" exposed by the MCP demo server, called over MCP.`,
    parameters:
      (sanitizeSchema(tool.inputSchema) as Record<string, unknown>) ?? {
        type: "object",
        properties: {},
      },
    execute: async (args) => {
      const result = await client.callTool({ name: tool.name, arguments: args });
      const text = contentToText(result.content).slice(0, MAX_MCP_RESULT_CHARS);
      if (result.isError) {
        throw new Error(text || `MCP tool "${tool.name}" returned an error`);
      }
      return text || "(empty result)";
    },
  }));
}
