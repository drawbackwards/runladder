import { redis } from "@/lib/redis";
import {
  INDUSTRIES,
  RESERVED_INDUSTRY_VALUES,
  isKnownIndustry,
  matchExistingIndustry,
} from "@/lib/industries";

/**
 * Admin-extensible industry registry (#422, Michael's feedback on the fixed
 * list). The curated base list lives in code (src/lib/industries.ts); this
 * adds an ADD-ONLY overflow so an admin can introduce a missing industry
 * mid-provisioning without a deploy and without free text per org.
 *
 * Guardrails preserved:
 *   - Additions are slugified + deduped, so two admins typing "Banking" and
 *     "banking " converge on one bucket.
 *   - No rename, no delete — slugs must stay stable forever because the
 *     learning aggregate keys off them. Removing a mistake is a deliberate
 *     code/Redis operation, not a UI affordance.
 *   - Custom entries that prove durable should graduate into INDUSTRIES in
 *     code (same value, so nothing forks).
 *
 * Storage: hash `industries:custom` (slug -> display label). Never touched
 * by the #398 purge.
 */

const REGISTRY_KEY = "industries:custom";

export type IndustryOption = { value: string; label: string; custom?: boolean };

export function slugifyIndustry(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/** Base list + custom additions, base order first, customs alphabetical. */
export async function listIndustries(): Promise<IndustryOption[]> {
  let custom: Record<string, string> = {};
  try {
    custom = (await redis.hgetall<Record<string, string>>(REGISTRY_KEY)) ?? {};
  } catch {
    // registry read is best-effort; the base list always works
  }
  const customOptions = Object.entries(custom)
    .map(([value, label]) => ({ value, label: String(label), custom: true }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return [...INDUSTRIES, ...customOptions];
}

/** True if `v` is a base industry or a registered custom one. */
export async function isValidIndustry(v: unknown): Promise<boolean> {
  if (isKnownIndustry(v)) return true;
  if (typeof v !== "string" || !v) return false;
  try {
    return Boolean(await redis.hexists(REGISTRY_KEY, v));
  } catch {
    return false;
  }
}

/**
 * Add a custom industry by display label. Idempotent: if the slug already
 * exists (base or custom), returns the existing entry instead of erroring,
 * so double-submits and near-duplicates converge.
 */
export async function addIndustry(
  rawLabel: string,
): Promise<{ ok: true; option: IndustryOption } | { ok: false; error: string }> {
  const label = rawLabel.trim().replace(/\s+/g, " ");
  if (label.length < 2 || label.length > 60) {
    return { ok: false, error: "Industry name must be 2-60 characters." };
  }
  const value = slugifyIndustry(label);
  if (!value) {
    return { ok: false, error: "Industry name needs letters or numbers." };
  }
  if ((RESERVED_INDUSTRY_VALUES as readonly string[]).includes(value)) {
    return {
      ok: false,
      error: `"${label}" is a reserved internal bucket and can't be an industry.`,
    };
  }

  const base = INDUSTRIES.find((i) => i.value === value);
  if (base) return { ok: true, option: { ...base } };

  const existing = await redis.hget<string>(REGISTRY_KEY, value);
  if (existing) {
    return { ok: true, option: { value, label: String(existing), custom: true } };
  }

  // Near-duplicate convergence: "Fintech" must land on Fintech & Banking,
  // not mint a parallel bucket the aggregate can never merge back.
  const near = matchExistingIndustry(label, await listIndustries());
  if (near) return { ok: true, option: near };

  await redis.hset(REGISTRY_KEY, { [value]: label });
  return { ok: true, option: { value, label, custom: true } };
}
