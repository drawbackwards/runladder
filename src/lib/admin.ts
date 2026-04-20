/**
 * Admin helpers — auth gate for /admin pages and /api/admin/* routes,
 * plus a typed proxy for the plugin backend (ai-design-assistant) admin
 * endpoints while plugin data still lives there.
 *
 * Env vars (runladder project):
 *   PLUGIN_BACKEND_URL   — e.g. https://ai-design-assistant-ebon.vercel.app
 *   PLUGIN_ADMIN_KEY     — same value as ai-design-assistant's ADMIN_KEY env var
 *   ADMIN_EMAILS         — comma-separated allowlist. Defaults to Ward's emails.
 */
import { auth, clerkClient } from "@clerk/nextjs/server";

const ADMIN_EMAILS = (
  process.env.ADMIN_EMAILS || "ward@drawbackwards.com,ward.andrews@gmail.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Returns the authenticated admin's email, or null if unauthorized.
 * Throws no error — callers decide how to respond (UI redirect vs API 403).
 */
export async function getAdminEmail(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (!email) return null;
  if (!ADMIN_EMAILS.includes(email)) return null;
  return email;
}

/* ── Plugin backend proxy ────────────────────────────────────────────── */

const PLUGIN_BACKEND_URL =
  process.env.PLUGIN_BACKEND_URL || "https://ai-design-assistant-ebon.vercel.app";

function pluginAdminKey(): string {
  const k = process.env.PLUGIN_ADMIN_KEY;
  if (!k) {
    throw new Error(
      "PLUGIN_ADMIN_KEY is not set in runladder env. Copy ai-design-assistant's ADMIN_KEY value here.",
    );
  }
  return k;
}

type PluginFetchOpts = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  search?: Record<string, string | number | undefined>;
};

/**
 * Fetch against the plugin backend with the admin key attached.
 * Never expose the admin key to the browser — this runs server-side only.
 */
export async function pluginFetch<T = unknown>(
  path: string,
  opts: PluginFetchOpts = {},
): Promise<{ ok: true; status: number; data: T } | { ok: false; status: number; error: string }> {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, PLUGIN_BACKEND_URL);
  for (const [k, v] of Object.entries(opts.search ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  try {
    const res = await fetch(url.toString(), {
      method: opts.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": pluginAdminKey(),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });

    let data: unknown = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const err =
        (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : undefined) || `Plugin backend returned ${res.status}`;
      return { ok: false, status: res.status, error: err };
    }
    return { ok: true, status: res.status, data: data as T };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, status: 502, error: `Plugin backend unreachable: ${msg}` };
  }
}
