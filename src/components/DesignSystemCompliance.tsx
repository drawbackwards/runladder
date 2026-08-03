/**
 * Renders the advisory Design System Compliance outcome on a score result
 * (#400). Mirrors StyleGuideFindings so the two advisory sections read as
 * siblings under the Findings block. Four states, so it's never silent when
 * the check ran:
 *   - compliant   → positive confirmation card
 *   - issues      → one card per drift finding
 *   - no-library  → the scored file had no design-system libraries enabled
 *   - unavailable → a calm "couldn't check this time" card
 * Returns null only when there's no outcome at all (score predates the
 * feature, or came from a surface that can't compute it — web/Skill/upload).
 * Findings are computed deterministically in the Figma plugin sandbox from
 * the libraries enabled in the scored file. Always advisory — never affects
 * the Ladder score.
 */
export type DesignSystemResultView = {
  status: "compliant" | "issues" | "no-library" | "unavailable";
  /** The enabled libraries the frame was diffed against. */
  library?: {
    names: string[];
    collections?: number;
    colorVariables?: number;
  } | null;
  findings: {
    /** Which drift check fired: detached | rogue-component | color | typography */
    check: string;
    /** Layer name/path in the scored frame, e.g. "Card/CTA Button". */
    node: string;
    /** Human-readable description of the drift. */
    detail: string;
    /** Library value the layer should use, when known (e.g. "color/brand/500 #6AC89B"). */
    expected?: string;
    /** The layer's actual value (e.g. "#6BC79A"). */
    actual?: string;
    /**
     * "exact" findings are facts (an unbound value that matches a library
     * token, a detached instance); "inferred" findings are near-match
     * estimates (off-palette color close to a token). Drives the estimate
     * caveat, matching the ticket's confidence-labeling rule.
     */
    confidence?: "exact" | "inferred";
  }[];
};

const CARD = "border border-[#333] bg-[#1e1e1e] p-6";

/** Pill labels for the drift checks. Unknown checks fall back to the raw key. */
const CHECK_LABELS: Record<string, string> = {
  detached: "Detached instance",
  "rogue-component": "Rebuilt component",
  color: "Color",
  typography: "Typography",
};

export function DesignSystemCompliance({
  designSystem,
}: {
  designSystem?: DesignSystemResultView | null;
}) {
  if (!designSystem) return null;

  const { status, findings } = designSystem;
  const libNames = (designSystem.library?.names ?? []).filter(Boolean);
  const libLabel =
    libNames.length > 0 ? libNames.join(", ") : "your design system";

  const subtext =
    status === "issues"
      ? `${findings.length} ${findings.length === 1 ? "issue" : "issues"} · doesn't affect your score`
      : "doesn't affect your score";

  // Estimate caveat: exact findings are facts (unbound-but-matching values,
  // detached instances); near-match color findings are estimates. Shown only
  // when an estimate is actually present.
  const hasEstimates =
    status === "issues" && findings.some((f) => f.confidence === "inferred");

  return (
    <div className="space-y-1 mt-10">
      {/* Heading — outside any box, matching the Findings section. */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[10px] text-muted uppercase tracking-widest">
          Design system
        </span>
        <span className="text-[10px] text-[#444]">{subtext}</span>
      </div>

      {hasEstimates && (
        <div className="border border-[#b8860b]/50 bg-[#b8860b]/10 px-4 py-3 mb-3">
          <p className="text-xs text-[#e3c46b] leading-relaxed">
            Findings marked as estimates are near-matches to a library token,
            not exact facts. Exact findings come straight from the layer data.
          </p>
        </div>
      )}

      {status === "compliant" && (
        <div className="flex items-start gap-3 border border-ladder-green/40 bg-ladder-green/5 p-6">
          <svg
            viewBox="0 0 20 20"
            className="w-5 h-5 shrink-0 mt-0.5 text-ladder-green"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              d="M4.5 10.5l3.5 3.5L15.5 6.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <p className="text-sm font-bold text-ladder-green">
              No drift from {libLabel}
            </p>
            <p className="text-xs text-body leading-relaxed mt-1">
              Every layer we checked uses the library&apos;s components,
              tokens, and styles. Never affects your score.
            </p>
          </div>
        </div>
      )}

      {status === "no-library" && (
        <div className={CARD}>
          <p className="text-xs text-body leading-relaxed">
            No design-system libraries were enabled in the scored file, so
            there was nothing to check against. Enable your team&apos;s library
            in Figma (Assets → Libraries) and re-scan. Your Ladder score
            isn&apos;t affected.
          </p>
        </div>
      )}

      {status === "unavailable" && (
        <div className={CARD}>
          <p className="text-xs text-body leading-relaxed">
            Couldn&apos;t check this screen against {libLabel} this time. Your
            Ladder score isn&apos;t affected. Try another scan to re-check.
          </p>
        </div>
      )}

      {status === "issues" &&
        findings.map((f, i) => (
          <div key={i} className={CARD}>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block text-[10px] uppercase tracking-widest px-2 py-0.5 border border-[#444] text-muted">
                {CHECK_LABELS[f.check] ?? f.check}
              </span>
              {f.confidence === "inferred" && (
                <span className="inline-block text-[10px] uppercase tracking-widest px-2 py-0.5 border border-[#b8860b]/50 text-[#e3c46b]">
                  Estimate
                </span>
              )}
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              <span className="font-mono">{f.node}</span>
            </p>
            <p className="text-xs text-body leading-relaxed mt-1">{f.detail}</p>
            {(f.expected || f.actual) && (
              <div className="border-t border-[#2a2a2a] pt-3 mt-3">
                <p className="text-xs text-foreground leading-relaxed font-mono">
                  {f.actual && (
                    <span className="line-through text-muted">{f.actual}</span>
                  )}
                  {f.actual && f.expected && (
                    <span className="text-muted"> → </span>
                  )}
                  {f.expected && <span>{f.expected}</span>}
                </p>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
