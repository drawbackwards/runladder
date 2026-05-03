import { NextRequest, NextResponse } from "next/server";
import { rotateSkillToken } from "@/lib/skill-auth";
import { CURRENT_API_VERSION } from "@/lib/app-version";

const API_VERSION_HEADERS = { "X-Ladder-API-Version": CURRENT_API_VERSION };

/**
 * Mint (or rotate) a Ladder personal token for a Clerk user.
 *
 * Called server-to-server by ai-design-assistant after it has verified an
 * email + password against Clerk on the plugin's behalf. The plugin then
 * stores the returned token and sends it as a Bearer on subsequent calls.
 *
 * Reuses the Skill token format (`ladder_skl_...`) since one token works
 * across every authenticated surface (web, Skill, Figma).
 *
 * Auth model: shared service secret (X-Ladder-Service-Token header).
 *
 * Body: { userId: "<clerk_user_id>" }
 * Returns: { token: "ladder_skl_..." }
 */
export async function POST(req: NextRequest) {
  const serviceToken = req.headers.get("x-ladder-service-token") ?? "";
  const expected = process.env.LADDER_SERVICE_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "Service not configured." },
      { status: 503, headers: API_VERSION_HEADERS },
    );
  }
  if (serviceToken !== expected) {
    return NextResponse.json(
      { error: "Invalid service token" },
      { status: 401, headers: API_VERSION_HEADERS },
    );
  }

  try {
    const body = (await req.json()) as { userId?: string };
    const userId = body.userId?.trim();
    if (!userId) {
      return NextResponse.json(
        { error: "Body must include a userId." },
        { status: 400, headers: API_VERSION_HEADERS },
      );
    }

    const token = await rotateSkillToken(userId);
    return NextResponse.json(
      { token },
      { headers: API_VERSION_HEADERS },
    );
  } catch (err) {
    console.error("[LADDER:ERROR] Plugin issue-token:", err);
    return NextResponse.json(
      { error: "Token issuance failed." },
      { status: 500, headers: API_VERSION_HEADERS },
    );
  }
}
