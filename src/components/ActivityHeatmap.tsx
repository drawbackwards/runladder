"use client";

export type DailyActivity = {
  /** YYYY-MM-DD (UTC) */
  date: string;
  /** Number of scores logged that day. */
  count: number;
  /** Average score for the day, or null if no scores. */
  avgScore: number | null;
};

/**
 * GitHub-style activity grid for a member's last N days of scoring.
 * Columns are weeks, rows are weekdays (Sun -> Sat). Cells dim by
 * score volume only — score quality lives in the row's stats column
 * so the heatmap stays focused on "are they showing up?".
 *
 * `activity` must be ordered oldest -> newest; each entry is one day.
 */
export function ActivityHeatmap({
  activity,
  cellSize = 8,
  cellGap = 2,
  emptyClassName = "bg-[#222]",
}: {
  activity: DailyActivity[];
  cellSize?: number;
  cellGap?: number;
  emptyClassName?: string;
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
    <div className="flex" style={{ gap: `${cellGap}px` }}>
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col" style={{ gap: `${cellGap}px` }}>
          {week.map((cell, di) => {
            const intensity = intensityClass(cell?.count ?? 0);
            const titleText = cell
              ? `${cell.date}: ${cell.count} score${cell.count === 1 ? "" : "s"}${
                  cell.avgScore !== null ? ` · avg ${cell.avgScore.toFixed(1)}` : ""
                }`
              : undefined;
            return (
              <div
                key={di}
                className={cell ? intensity : "opacity-0"}
                style={{
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
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
