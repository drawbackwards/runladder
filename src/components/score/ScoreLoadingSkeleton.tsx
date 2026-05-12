/**
 * Loading state for the /score page. Mirrors the layout of the final
 * scorecard, but with shimmer placeholders where the real values will
 * land. The intent is a quick-win UX: the user sees the destination
 * before the model finishes, so the wait feels like the system
 * filling in details instead of staring at a spinner.
 *
 * Composition:
 *   - Left column: the user's screenshot at full size, with the
 *     scanner-active overlay (corner ticks + traveling scan line).
 *   - Right column: a skeleton "Screen Score" panel. The summary
 *     slot hosts the live scan-phase message so the user gets a
 *     real signal of progress without abandoning the skeleton shape.
 *   - Below: skeleton rung breakdown, skeleton next-step banner,
 *     skeleton findings cards.
 *
 * All visual rhythm comes from `.shimmer` and `.typing-dot` defined
 * in globals.css. No new keyframes needed.
 */
// Local copy of the inline ScannerCorners helper from /score/page.tsx
// (same scanner-corner classes defined in globals.css). Inlined here
// so the skeleton component stays self-contained.
function ScannerCorners() {
  return (
    <>
      <span className="scanner-corner scanner-corner-tl" />
      <span className="scanner-corner scanner-corner-tr" />
      <span className="scanner-corner scanner-corner-bl" />
      <span className="scanner-corner scanner-corner-br" />
    </>
  );
}

type Props = {
  image: string;
  scanPhase: number;
  scanMessages: string[];
};

export function ScoreLoadingSkeleton({ image, scanPhase, scanMessages }: Props) {
  const activeMessage = scanMessages[scanPhase] ?? scanMessages[0];

  return (
    <div className="space-y-10">
      {/* ── Score hero row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8">
        {/* Left: screenshot with scanner overlay (existing pattern) */}
        <div className="relative border border-ladder-green/30 bg-[#1e1e1e] p-1 scanner-active">
          <ScannerCorners />
          <img
            src={image}
            alt="Scanning"
            className="w-full max-h-[420px] object-contain opacity-70"
          />
        </div>

        {/* Right: skeleton score panel */}
        <div className="border border-[#333] bg-[#1e1e1e] p-8 flex flex-col">
          <span className="text-[10px] text-muted uppercase tracking-widest mb-6">
            Screen Score
          </span>
          <div className="flex-1 flex flex-col items-start justify-center">
            {/* Big score number placeholder */}
            <div className="shimmer h-14 w-32" />
            {/* Level label placeholder */}
            <div className="shimmer h-3 w-24 mt-3" />

            {/* Gap to next */}
            <div className="mt-6 pt-4 border-t border-[#333] w-full">
              <span className="text-[10px] text-muted uppercase tracking-widest">
                Gap to next level
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="shimmer h-5 w-10" />
                <span className="text-[11px] text-muted">points</span>
              </div>
            </div>

            {/* ScoreBar placeholder — five segments to match the real bar */}
            <div className="mt-6 w-full">
              <div className="grid grid-cols-5 gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="shimmer h-2" />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-[#444]">
                <span>1.0</span>
                <span>2.0</span>
                <span>3.0</span>
                <span>4.0</span>
                <span>5.0</span>
              </div>
            </div>
          </div>

          {/* Live phase message lives where the summary will land —
              the eye is already drawn here, and rotating text makes
              the panel feel responsive instead of frozen. */}
          <div className="mt-6 border-t border-[#333] pt-4">
            <div className="flex items-center gap-3">
              <span className="flex gap-1">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </span>
              <span
                key={activeMessage}
                className="text-[11px] text-ladder-green tracking-wide animate-fade-up"
              >
                {activeMessage}
              </span>
            </div>
            <p className="text-[10px] text-muted mt-3">
              Calibrating against the Ladder framework. Usually 10 to 15
              seconds.
            </p>
          </div>
        </div>
      </div>

      {/* ── Rung breakdown skeleton ───────────────────────────────── */}
      <div className="border border-[#333] bg-[#1e1e1e] p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-[10px] text-muted uppercase tracking-widest">
            Rung breakdown
          </span>
        </div>
        <div className="space-y-4">
          {[
            { label: "Meaningful", w: "w-1/5" },
            { label: "Delightful", w: "w-1/3" },
            { label: "Comfortable", w: "w-2/5" },
            { label: "Usable", w: "w-1/2" },
            { label: "Functional", w: "w-3/5" },
          ].map((row, i) => (
            <div key={row.label} className="flex items-center gap-4">
              <span className="text-[10px] text-muted uppercase tracking-widest w-24 flex-shrink-0">
                {row.label}
              </span>
              <div className="flex-1 h-2 bg-[#1a1a1a]">
                <div
                  className={`shimmer h-full ${row.w}`}
                  style={{ animationDelay: `${i * 0.12}s` }}
                />
              </div>
              <div className="shimmer h-3 w-10 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Next-step banner skeleton ─────────────────────────────── */}
      <div className="border border-ladder-green/20 bg-[#1e1e1e] p-5 flex items-start gap-4">
        <span className="text-ladder-green text-sm mt-0.5">&#8594;</span>
        <div className="flex-1 space-y-2">
          <span className="text-[10px] text-ladder-green uppercase tracking-widest">
            Fix this first
          </span>
          <div className="shimmer h-3 w-4/5 mt-1" />
          <div className="shimmer h-3 w-3/5" />
        </div>
      </div>

      {/* ── Findings skeletons ────────────────────────────────────── */}
      <div className="space-y-1">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-[10px] text-muted uppercase tracking-widest">
            Findings
          </span>
          <span className="text-[10px] text-[#444]">ranked by impact</span>
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="border border-[#333] bg-[#1e1e1e] p-6"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-8 h-8 border border-[#444] flex items-center justify-center text-xs text-muted">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="shimmer h-4 w-1/2" />
                  <div className="shimmer h-4 w-16" />
                </div>
                <div className="shimmer h-3 w-full" />
                <div className="shimmer h-3 w-4/5" />
                <div className="border-t border-[#2a2a2a] pt-3 mt-3 space-y-2">
                  <div className="shimmer h-3 w-3/4" />
                  <div className="shimmer h-3 w-1/2" />
                </div>
              </div>
              <div className="flex-shrink-0 text-right space-y-1">
                <div className="shimmer h-6 w-10 ml-auto" />
                <div className="shimmer h-3 w-16 ml-auto" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
