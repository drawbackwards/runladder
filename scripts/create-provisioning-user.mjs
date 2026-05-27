#!/usr/bin/env node
/**
 * Creates the hidden provisioning service account used to own client orgs (#190).
 *
 * Why this exists:
 *   Clerk requires an existing user as an org's first `createdBy` admin. If we
 *   used the acting Drawbackwards admin, that admin would become a member of
 *   (and get trapped in) every client org. Instead we create one dedicated
 *   service account that owns all client orgs. It never logs in; it only owns
 *   orgs and sends Team Lead invitations. It is hidden from client-facing views
 *   (see isProvisioningUser in src/lib/orgs.ts).
 *
 * Usage:
 *   node scripts/create-provisioning-user.mjs
 *
 * Requires CLERK_SECRET_KEY in the environment (loaded from .env.local). The
 * resulting user id must be set as PROVISIONING_USER_ID in .env.local (and in
 * each deployed Vercel scope) so the provisioning route can find it.
 *
 * NOTE: Clerk instances are isolated. The id created here is valid only for the
 * Clerk instance whose CLERK_SECRET_KEY is loaded. Production (a separate Clerk
 * instance, pending #181) will need its own run of this script.
 */
import pkg from "@next/env";
import { createClerkClient } from "@clerk/backend";

const { loadEnvConfig } = pkg;

loadEnvConfig(process.cwd(), true);

const secretKey = process.env.CLERK_SECRET_KEY;
if (!secretKey) {
  console.error("CLERK_SECRET_KEY is not set. Add it to .env.local first.");
  process.exit(1);
}

// Provisional alias for the dev Clerk instance. The production service account
// email is pending confirmation (a free alias / Google Group is sufficient —
// the account never receives mail or logs in).
const EMAIL = process.env.PROVISIONING_EMAIL || "ladder-provisioning@drawbackwards.com";

const clerk = createClerkClient({ secretKey });

async function main() {
  // Reuse an existing service account if one already exists for this email, so
  // re-running the script is idempotent and doesn't create duplicates.
  const existing = await clerk.users.getUserList({ emailAddress: [EMAIL] });
  if (existing.data.length > 0) {
    const user = existing.data[0];
    console.log(`Service account already exists for ${EMAIL}`);
    console.log(`PROVISIONING_USER_ID=${user.id}`);
    return;
  }

  const user = await clerk.users.createUser({
    emailAddress: [EMAIL],
    firstName: "Ladder",
    lastName: "Provisioning",
    skipPasswordRequirement: true,
    publicMetadata: { serviceAccount: true },
  });

  console.log(`Created provisioning service account for ${EMAIL}`);
  console.log("");
  console.log("Set this in .env.local (and each Vercel scope):");
  console.log(`PROVISIONING_USER_ID=${user.id}`);
}

main().catch((err) => {
  console.error("Failed to create provisioning user:");
  console.error(err);
  process.exit(1);
});
