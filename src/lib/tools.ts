import dns from "node:dns/promises";
import net from "node:net";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_RETURNED_CHARS = 6_000;

export function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  return match ? match[0] : null;
}

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
