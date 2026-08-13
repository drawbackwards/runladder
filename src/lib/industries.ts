/**
 * Canonical client-industry list (#422). Industry is the ONLY client-linked
 * dimension the de-identified learning store keeps, and it's stamped into
 * learning records at capture/purge time — records can never be re-bucketed
 * afterwards (the identified source data is deleted on termination). So:
 *
 *   - Values are stable slugs; NEVER rename one (it would fork the
 *     aggregate). Labels are display-only and safe to reword.
 *   - Picked from a dropdown, never free text, so the aggregate stays
 *     consistent across admins.
 *   - No "Other" bucket — records filed under a junk category are
 *     permanently unclassifiable. When a client doesn't fit, add a category:
 *     self-serve via "Add new industry" in the admin dropdowns
 *     (src/lib/industry-registry.ts, add-only), or a row here. Durable
 *     registry additions should graduate into this list (same slug).
 *
 * Client-safe: pure data, imported by admin forms and the API validators.
 */

export const INDUSTRIES = [
  { value: "fintech-banking", label: "Fintech & Banking" },
  { value: "insurance", label: "Insurance" },
  { value: "healthcare", label: "Healthcare" },
  { value: "ecommerce-retail", label: "E-commerce & Retail" },
  { value: "saas-b2b", label: "B2B SaaS" },
  { value: "developer-tools", label: "Developer Tools" },
  { value: "consumer-social", label: "Consumer Apps & Social" },
  { value: "media-entertainment", label: "Media & Entertainment" },
  { value: "education", label: "Education" },
  { value: "travel-hospitality", label: "Travel & Hospitality" },
  { value: "government-public", label: "Government & Public Sector" },
  { value: "real-estate", label: "Real Estate" },
  { value: "telecom-utilities", label: "Telecom & Utilities" },
  { value: "logistics-transportation", label: "Logistics & Transportation" },
  { value: "manufacturing-industrial", label: "Manufacturing & Industrial" },
  { value: "nonprofit", label: "Nonprofit" },
] as const;

export type IndustryValue = (typeof INDUSTRIES)[number]["value"];

export function isKnownIndustry(v: unknown): v is IndustryValue {
  return (
    typeof v === "string" && INDUSTRIES.some((i) => i.value === v)
  );
}

/** Display label for a stored slug; falls back to the slug itself. */
export function industryLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return INDUSTRIES.find((i) => i.value === value)?.label ?? value;
}

/**
 * Reserved buckets that exist only as capture-time defaults, never as
 * pickable or addable industries:
 *   - "unknown"  — individual users with no client org
 *   - "internal" — members of the Drawbackwards org (dogfood data, kept
 *     separable from real client data in the aggregate)
 */
export const RESERVED_INDUSTRY_VALUES = ["unknown", "internal"] as const;

/**
 * UI sentinel (NOT a real industry) offered in the industry picker to mark an
 * account as multi-industry / agency (#429). The admin APIs translate it to
 * `publicMetadata.industryMode = "multiple"`, which enables per-score tagging
 * and clears the org's single `industry`. It is never stored as an industry
 * slug and never becomes a learning-store bucket.
 */
export const MULTIPLE_INDUSTRY_VALUE = "multiple";
export const MULTIPLE_INDUSTRY_LABEL = "Multiple industries (agency)";

/**
 * Tokens for near-duplicate matching: lowercase alphanumeric words, with
 * single-letter fragments merged into the next word so "E-commerce" and
 * "Ecommerce" tokenize identically (["ecommerce"]).
 */
export function industryTokens(label: string): string[] {
  const words = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .filter((w) => w !== "and");
  const merged: string[] = [];
  for (const w of words) {
    const prev = merged[merged.length - 1];
    if (prev && prev.length <= 1) merged[merged.length - 1] = prev + w;
    else merged.push(w);
  }
  return merged;
}

/**
 * Find the existing industry a new label should converge to, if any: every
 * token of the new label already appears in an existing option's label
 * ("Fintech" → Fintech & Banking, "E-commerce" → E-commerce & Retail).
 * Token equality only — "Tech" does NOT match Fintech & Banking. Returns
 * null when the label is genuinely new.
 */
export function matchExistingIndustry<T extends { label: string }>(
  label: string,
  options: readonly T[],
): T | null {
  const tokens = industryTokens(label);
  if (!tokens.length) return null;
  return (
    options.find((o) => {
      const existing = industryTokens(o.label);
      return tokens.every((t) => existing.includes(t));
    }) ?? null
  );
}
