/**
 * Renders the advisory team style-guide outcome on a score result. Mirrors the
 * Findings section's layout (heading outside any box; each item in its own
 * `border border-[#333] bg-[#1e1e1e] p-6` card; same type scale) so the two
 * sections read as siblings. Three states, so it's never silent when a team
 * has a guide configured (#team-style-guide):
 *   - compliant   → positive confirmation card
 *   - issues      → one card per flagged item
 *   - unavailable → a calm "couldn't check this time" card
 * Returns null only when there's no outcome at all (no guide configured).
 * Always advisory — never affects the Ladder score.
 */
export type StyleGuideResultView = {
  status: "compliant" | "issues" | "unavailable";
  teamName?: string | null;
  findings: {
    originalText: string;
    issue?: string;
    suggestion: string;
    severity?: string;
    category?: string;
  }[];
};

const CARD = "border border-[#333] bg-[#1e1e1e] p-6";

export function StyleGuideFindings({
  styleGuide,
}: {
  styleGuide?: StyleGuideResultView | null;
}) {
  if (!styleGuide) return null;

  const { status, findings } = styleGuide;
  const team = styleGuide.teamName?.trim();
  const teamLabel = team ? `${team} style guide` : "your team's style guide";

  const subtext =
    status === "issues"
      ? `${findings.length} ${findings.length === 1 ? "issue" : "issues"} · doesn't affect your score`
      : "doesn't affect your score";

  return (
    <div className="space-y-1 mt-10">
      {/* Heading — outside any box, matching the Findings section. */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[10px] text-muted uppercase tracking-widest">
          Style guide
        </span>
        <span className="text-[10px] text-[#444]">{subtext}</span>
      </div>

      {status === "compliant" && (
        <div className={CARD}>
          <p className="text-sm font-bold text-ladder-green">
            Complies with the {teamLabel}
          </p>
          <p className="text-xs text-body leading-relaxed mt-2">
            No copy issues found.
          </p>
        </div>
      )}

      {status === "unavailable" && (
        <div className={CARD}>
          <p className="text-xs text-body leading-relaxed">
            Couldn&apos;t check against the {teamLabel} this time. Your Ladder
            score isn&apos;t affected. Try another scan to re-check.
          </p>
        </div>
      )}

      {status === "issues" &&
        findings.map((f, i) => (
          <div key={i} className={CARD}>
            {f.category && (
              <span className="inline-block text-[10px] uppercase tracking-widest px-2 py-0.5 border border-[#444] text-muted mb-3">
                {f.category}
              </span>
            )}
            <p className="text-sm text-foreground leading-relaxed">
              <span className="line-through text-muted">{f.originalText}</span>
              <span className="text-muted"> → </span>
              <span>{f.suggestion}</span>
            </p>
            {f.issue && (
              <div className="border-t border-[#2a2a2a] pt-3 mt-3">
                <p className="text-xs text-foreground leading-relaxed">
                  {f.issue}
                </p>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
