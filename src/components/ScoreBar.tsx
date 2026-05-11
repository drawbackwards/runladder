/**
 * ScoreBar — the canonical Ladder score visualization.
 *
 * Five equal segments separated by thin gaps so the user always sees the
 * 1–5 scale at a glance, even at a score of 0. Each segment fills
 * proportionally with white as the score crosses it:
 *
 *   3.4 → [████][████][████][██░░][░░░░]
 *
 * Bars are intentionally white (no level color coding) — Ward, 2026-05-11.
 * The score number on the page is what conveys judgment.
 *
 * Sizes default to the same height the per-rung breakdown has historically
 * used (h-2). Pass `size="lg"` for the hero score panel or `size="sm"` for
 * compact list rows.
 */
type Size = "sm" | "md" | "lg";

const HEIGHT_BY_SIZE: Record<Size, string> = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-2.5",
};

export function ScoreBar({
  score,
  size = "md",
  className = "",
  animate = true,
}: {
  /** 0.0–5.0. Values outside this range are clamped. */
  score: number;
  size?: Size;
  className?: string;
  animate?: boolean;
}) {
  const clamped = Math.max(0, Math.min(5, score));
  const segments = [1, 2, 3, 4, 5];
  const height = HEIGHT_BY_SIZE[size];

  return (
    <div className={`flex items-stretch gap-1 w-full ${height} ${className}`}>
      {segments.map((seg) => {
        const fillPct = Math.max(0, Math.min(1, clamped - (seg - 1))) * 100;
        return (
          <div
            key={seg}
            className="flex-1 bg-[#2a2a2a] rounded-sm overflow-hidden relative"
          >
            <div
              className={`absolute inset-y-0 left-0 bg-foreground ${
                animate ? "transition-all duration-700 ease-out" : ""
              }`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}
