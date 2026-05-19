/**
 * Admin helpers — auth gate for /admin pages and /api/admin/* routes,
 * plus a typed proxy for the plugin backend (ai-design-assistant) admin
 * endpoints while plugin data still lives there.
 *
 * Auth model (three tiers, additive):
 *   SUPER_ADMIN_EMAILS — hardcoded, always admin, never removable via UI.
 *                        Editing this list is privileged: PR + merge + deploy
 *                        in production, plus an out-of-band passphrase
 *                        confirmation by Ward.
 *   ADMIN_EMAILS env   — comma-separated regular admin allowlist (Vercel).
 *                        Super admins are merged in regardless of this value.
 *                        Gates /admin pages and /api/admin/* routes.
 *   TEAM_EMAILS env    — comma-separated team allowlist for /hq (internal
 *                        team hub). Does NOT grant platform admin powers.
 *                        Admins are merged in automatically (any admin can
 *                        also see /hq).
 *
 * Env vars (runladder project):
 *   PLUGIN_BACKEND_URL   — e.g. https://ai-design-assistant-ebon.vercel.app
 *   PLUGIN_ADMIN_KEY     — same value as ai-design-assistant's ADMIN_KEY env var
 *   ADMIN_EMAILS         — comma-separated regular admin allowlist
 *   TEAM_EMAILS          — comma-separated team-hub allowlist
 */
import { auth, clerkClient } from "@clerk/nextjs/server";

const SUPER_ADMIN_EMAILS = [
  "ward@drawbackwards.com",
  "ward.andrews@gmail.com",
] as const;

const ENV_ADMIN_EMAILS = (
  process.env.ADMIN_EMAILS || "jordan@drawbackwards.com,michael@drawbackwards.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const ADMIN_EMAILS = Array.from(
  new Set([...SUPER_ADMIN_EMAILS.map((e) => e.toLowerCase()), ...ENV_ADMIN_EMAILS]),
);

// Team allowlist for /hq. Populate via TEAM_EMAILS env on Vercel with
// Chester, Sean, and any other Drawbackwards teammates who need to see
// the internal hub without inheriting /admin powers.
const ENV_TEAM_EMAILS = (process.env.TEAM_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const TEAM_EMAILS = Array.from(new Set([...ADMIN_EMAILS, ...ENV_TEAM_EMAILS]));

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

/**
 * True if the email is a super admin (hardcoded, removal-protected).
 * Any future admin-removal UI must reject when this returns true.
 */
export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase();
  return SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === normalized);
}

/**
 * True if the target admin can be removed via the (future) admin UI.
 * Always false for super admins.
 */
export function canRemoveAdmin(email: string): boolean {
  return !isSuperAdmin(email);
}

/**
 * Team-hub auth check with a three-state result so server components can
 * choose between sign-in redirect and a 403 page.
 *
 *   anonymous    — no signed-in user, redirect to sign-in
 *   unauthorized — signed in but not on the team allowlist, show 403
 *   team         — on the allowlist (or an admin), render the page
 *
 * Admins automatically pass because TEAM_EMAILS includes ADMIN_EMAILS.
 */
export async function getTeamEmailWithStatus(): Promise<
  | { status: "anonymous" }
  | { status: "unauthorized"; email: string }
  | { status: "team"; email: string; isAdmin: boolean }
> {
  const { userId } = await auth();
  if (!userId) return { status: "anonymous" };

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (!email) return { status: "anonymous" };

  if (TEAM_EMAILS.includes(email)) {
    return { status: "team", email, isAdmin: ADMIN_EMAILS.includes(email) };
  }
  return { status: "unauthorized", email };
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
