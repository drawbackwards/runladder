import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPluginMeta } from "@/lib/plugin-meta";
import { CURRENT_PLUGIN_VERSION } from "@/lib/plugin-version";

/**
 * GET /api/plugin/meta — Figma plugin install state for the dashboard.
 *
 * Returns whether the signed-in user has ever used the plugin, what
 * version they have installed (from the last verify-token call), and
 * the current published version. Used by FigmaPluginCard to show a
 * "Connected" pill and an "Update available" banner when their
 * installed version drifts behind.
 *
 * No mutation here — version stamping happens in /api/plugin/verify-token
 * when the plugin's backend calls it on behalf of the user.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const meta = await getPluginMeta(userId);
  return NextResponse.json({
    hasUsed: !!meta?.lastUsedAt,
    lastUsedAt: meta?.lastUsedAt,
    installedVersion: meta?.installedVersion,
    currentVersion: CURRENT_PLUGIN_VERSION,
  });
}
