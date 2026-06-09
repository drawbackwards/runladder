"use client";

export type DailyActivity = {
  /** YYYY-MM-DD in the viewer's local day (see bucketActivity). */
  date: string;
  /** Number of scores logged that day. */
  count: number;
  /** Average score for the day, or null if no scores. */
  avgScore: number | null;
};

/**
 * Format a YYYY-MM-DD day string for a tooltip without a timezone shift.
 * `new Date("2026-06-02")` parses as UTC midnight and renders as the previous
 * day in behind-UTC zones; building the Date from local parts avoids that.
 */
function friendlyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * GitHub-style activity grid for a member's last N days of scoring.
 * Columns are weeks, rows are weekdays (Sun -> Sat). Cells dim by
 * score volume only — score quality lives in the row's stats column
 * so the heatmap stays focused on "are they showing up?".
 *
 * Cell dimensions are passed explicitly so the same component can
 * render a tight "ticker" (wide-and-short cells, inline next to a
 * row label) or a hero block (larger, more square-ish cells on a
 * detail page).
 *
 * `activity` must be ordered oldest -> newest; each entry is one day.
 */
export function ActivityHeatmap({
  activity,
  cellWidth = 8,
  cellHeight = 8,
  cellGap = 2,
  emptyClassName = "bg-[#222]",
  fill = false,
}: {
  activity: DailyActivity[];
  cellWidth?: number;
  cellHeight?: number;
  cellGap?: number;
  emptyClassName?: string;
  /**
   * Stretch the grid to fill its container's width: week columns flex
   * evenly and cells take the column width (ignoring `cellWidth`). The
   * default fixed-width mode is unchanged for the compact "ticker" usages.
   */
  fill?: boolean;
}) {
  if (activity.length === 0) {
    return (
      <div className="text-[10px] text-muted font-sans">No activity</div>
    );
  }

  // Pad the grid so the first column starts on Sunday. The first day
  // in `activity` could fall on any weekday; cells before it are blank
  // placeholders (rendered transparent so the column lines up).
  const firstDay = new Date(activity[0].date + "T00:00:00Z");
  const firstWeekday = firstDay.getUTCDay(); // 0 = Sun

  const cells: Array<DailyActivity | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (const d of activity) cells.push(d);
  // Round up to a full final week so the grid is rectangular.
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: Array<Array<DailyActivity | null>> = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div
      className={fill ? "flex w-full" : "flex"}
      style={{ gap: `${cellGap}px` }}
    >
      {weeks.map((week, wi) => (
        <div
          key={wi}
          className={fill ? "flex flex-col flex-1" : "flex flex-col"}
          style={{ gap: `${cellGap}px` }}
        >
          {week.map((cell, di) => {
            const intensity = intensityClass(cell?.count ?? 0);
            const titleText = cell
              ? `${friendlyDate(cell.date)}: ${cell.count} score${cell.count === 1 ? "" : "s"}${
                  cell.avgScore !== null ? ` · avg ${cell.avgScore.toFixed(1)}` : ""
                }`
              : undefined;
            return (
              <div
                key={di}
                className={`${cell ? intensity : "opacity-0"}${fill ? " w-full" : ""}`}
                style={{
                  width: fill ? undefined : `${cellWidth}px`,
                  height: `${cellHeight}px`,
                }}
                title={titleText}
                aria-label={titleText}
              />
            );
          })}
        </div>
      ))}
    </div>
  );

  function intensityClass(count: number): string {
    if (count === 0) return emptyClassName;
    if (count <= 2) return "bg-ladder-green/25";
    if (count <= 5) return "bg-ladder-green/55";
    if (count <= 9) return "bg-ladder-green/80";
    return "bg-ladder-green";
  }
}
