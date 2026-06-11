"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type {
  MockFrame,
  MockPin,
  MockReview,
  MockTeamTake,
} from "@/lib/reviews/mockData";
import { iterationsSorted } from "@/lib/reviews/mockData";
import { getScoreColor } from "@/lib/ladder";
import { MockScreen } from "@/components/reviews/MockScreen";

/** "You" — placeholder reviewer used for client-side mock submissions. */
const SELF_REVIEWER = {
  id: "self",
  name: "You",
  initials: "YO",
  role: "key" as const,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - +new Date(iso);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

export function FrameWorkspace({
  review,
  frame,
}: {
  review: MockReview;
  frame: MockFrame;
}) {
  const iters = iterationsSorted(frame);
  const currentIter = iters[iters.length - 1];
  const startIter = iters[0];
  const lift = currentIter && startIter
    ? Math.round((currentIter.score - startIter.score) * 10) / 10
    : 0;

  const [selectedIterId, setSelectedIterId] = useState(currentIter?.id);
  const [rightTab, setRightTab] = useState<"pin" | "takes" | "findings">(
    "pin",
  );

  // Pins are local state so the user can drop new pins and reply in the mock.
  const [pins, setPins] = useState<MockPin[]>(frame.pins);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(
    pins.find((p) => !p.resolved)?.id ?? null,
  );
  /** When true, clicking on the screen drops a pin at that location. */
  const [dropMode, setDropMode] = useState(false);
  /** Coords of an in-progress pin awaiting a comment. */
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [pendingComment, setPendingComment] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);

  // Team Takes are local state so the user can submit their own in the mock.
  const [takes, setTakes] = useState<MockTeamTake[]>(frame.teamTakes);
  const take =
    takes.length === 0
      ? null
      : Math.round((takes.reduce((a, t) => a + t.score, 0) / takes.length) * 10) /
        10;

  const selectedPin: MockPin | null = selectedPinId
    ? pins.find((p) => p.id === selectedPinId) ?? null
    : null;

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!dropMode) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPin({ x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) });
    setDropMode(false);
    setRightTab("pin");
  }

  function commitPendingPin() {
    if (!pendingPin || !pendingComment.trim()) return;
    const newPin: MockPin = {
      id: `pin_local_${Date.now()}`,
      x: pendingPin.x,
      y: pendingPin.y,
      author: SELF_REVIEWER,
      comment: pendingComment.trim(),
      createdAt: new Date().toISOString(),
      resolved: false,
      replies: [],
    };
    setPins((ps) => [...ps, newPin]);
    setSelectedPinId(newPin.id);
    setPendingPin(null);
    setPendingComment("");
  }

  function cancelPendingPin() {
    setPendingPin(null);
    setPendingComment("");
  }

  function addTeamTake(score: number, rationale: string) {
    const newTake: MockTeamTake = {
      id: `tt_local_${Date.now()}`,
      author: SELF_REVIEWER,
      score,
      rationale,
      createdAt: new Date().toISOString(),
    };
    setTakes((ts) => [...ts, newTake]);
  }

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[10px] text-muted uppercase tracking-widest mb-6 flex-wrap">
          <Link
            href="/dashboard/reviews"
            className="hover:text-foreground transition-colors"
          >
            Reviews
          </Link>
          <span className="text-[#444]">/</span>
          <Link
            href={`/dashboard/reviews/${review.slug}`}
            className="hover:text-foreground transition-colors"
          >
            {review.name}
          </Link>
          <span className="text-[#444]">/</span>
          <span className="text-foreground">{frame.name}</span>
        </div>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-2xl text-foreground font-sans mb-2">
              {frame.name}
            </h1>
            <p className="text-sm text-muted font-sans">
              {iters.length} iteration{iters.length !== 1 ? "s" : ""} ·{" "}
              {frame.pins.length} pin{frame.pins.length !== 1 ? "s" : ""} ·{" "}
              {frame.teamTakes.length} team take
              {frame.teamTakes.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <ScoreBadge
              label="Ladder"
              score={currentIter?.score ?? 0}
              primary
            />
            <ScoreBadge
              label="Team Take"
              score={take ?? null}
              hint={
                take !== null
                  ? `${frame.teamTakes.length} peer${frame.teamTakes.length !== 1 ? "s" : ""}`
                  : "no takes yet"
              }
            />
            <DeltaBadge lift={lift} />
            <Link
              href={`/score?review=${review.slug}`}
              className="text-[11px] font-semibold uppercase tracking-widest bg-ladder-green text-background px-4 py-2 hover:bg-ladder-green-light transition-colors"
            >
              + Score next iteration
            </Link>
          </div>
        </div>

        {/* Main canvas + right rail */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 mb-8">
          {/* Screen with pins */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[10px] text-muted uppercase tracking-widest">
                {pins.length} pin{pins.length !== 1 ? "s" : ""} ·{" "}
                {pins.filter((p) => !p.resolved).length} open
              </p>
              <button
                type="button"
                onClick={() => {
                  setDropMode((d) => !d);
                  cancelPendingPin();
                }}
                className={`text-[10px] font-semibold uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                  dropMode
                    ? "border-ladder-green bg-ladder-green text-background"
                    : "border-ladder-green/40 text-ladder-green hover:bg-ladder-green/10"
                }`}
              >
                {dropMode ? "Click on the screen ↓" : "+ Drop a pin"}
              </button>
            </div>
            <div
              ref={canvasRef}
              onClick={handleCanvasClick}
              className={`relative ${
                dropMode ? "cursor-crosshair" : "cursor-default"
              }`}
            >
              <MockScreen
                hue={frame.hue}
                name={frame.name}
                iterationLabel={
                  currentIter
                    ? `${frame.name} · ${formatDate(currentIter.scoredAt)}`
                    : frame.name
                }
              />
              {pins.map((pin, index) => (
                <PinMarker
                  key={pin.id}
                  pin={pin}
                  index={index + 1}
                  selected={selectedPinId === pin.id}
                  onSelect={() => {
                    if (dropMode) return;
                    setSelectedPinId(pin.id);
                    setRightTab("pin");
                  }}
                />
              ))}
              {pendingPin && (
                <PendingPinMarker
                  x={pendingPin.x}
                  y={pendingPin.y}
                  index={pins.length + 1}
                />
              )}
            </div>

            {pendingPin && (
              <div className="mt-3 border border-ladder-green/40 bg-ladder-green/[0.04] p-3">
                <p className="text-[10px] text-ladder-green uppercase tracking-widest font-mono mb-2">
                  New pin at {pendingPin.x.toFixed(0)}, {pendingPin.y.toFixed(0)}
                </p>
                <textarea
                  autoFocus
                  rows={2}
                  value={pendingComment}
                  onChange={(e) => setPendingComment(e.target.value)}
                  placeholder="What's the crit?"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] focus:border-ladder-green/50 outline-none px-3 py-2 text-xs text-foreground font-sans placeholder:text-muted transition-colors resize-none mb-2"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={commitPendingPin}
                    disabled={!pendingComment.trim()}
                    className="text-[10px] font-semibold uppercase tracking-widest bg-ladder-green text-background px-3 py-1.5 hover:bg-ladder-green-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Drop pin
                  </button>
                  <button
                    type="button"
                    onClick={cancelPendingPin}
                    className="text-[10px] font-semibold uppercase tracking-widest text-muted hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Iterations strip */}
            <div className="mt-6 border-t border-[#2a2a2a] pt-5">
              <p className="text-[10px] text-muted uppercase tracking-widest mb-3">
                Iterations
              </p>
              <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
                {iters.map((iter, idx) => {
                  const prior = idx > 0 ? iters[idx - 1] : null;
                  const stepDelta = prior
                    ? Math.round((iter.score - prior.score) * 10) / 10
                    : 0;
                  const isSelected = selectedIterId === iter.id;
                  return (
                    <button
                      key={iter.id}
                      type="button"
                      onClick={() => setSelectedIterId(iter.id)}
                      className={`flex-shrink-0 w-36 border ${
                        isSelected
                          ? "border-ladder-green bg-ladder-green/[0.06]"
                          : "border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#3a3a3a]"
                      } p-3 text-left transition-colors`}
                    >
                      <div className="flex items-baseline justify-between mb-2">
                        <span
                          className="text-xl font-bold tabular-nums"
                          style={{ color: getScoreColor(iter.score) }}
                        >
                          {iter.score.toFixed(1)}
                        </span>
                        {prior && (
                          <span
                            className={`text-[10px] font-mono font-semibold tabular-nums ${
                              stepDelta > 0
                                ? "text-ladder-green"
                                : stepDelta < 0
                                ? "text-ladder-red"
                                : "text-muted"
                            }`}
                          >
                            {stepDelta > 0 ? "↑" : stepDelta < 0 ? "↓" : "±"}
                            {Math.abs(stepDelta).toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted font-sans mb-2">
                        v{idx + 1} · {formatDate(iter.scoredAt)}
                      </p>
                      <p className="text-[10px] text-muted font-sans leading-relaxed line-clamp-3">
                        {iter.summary}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right rail */}
          <aside className="space-y-4">
            <div className="flex border-b border-[#2a2a2a]">
              <TabButton
                active={rightTab === "pin"}
                onClick={() => setRightTab("pin")}
                count={frame.pins.length}
              >
                Pins
              </TabButton>
              <TabButton
                active={rightTab === "takes"}
                onClick={() => setRightTab("takes")}
                count={frame.teamTakes.length}
              >
                Team Takes
              </TabButton>
              <TabButton
                active={rightTab === "findings"}
                onClick={() => setRightTab("findings")}
                count={frame.findings.length}
              >
                Findings
              </TabButton>
            </div>

            {rightTab === "pin" && (
              <PinPanel
                pins={pins}
                selectedPinId={selectedPinId}
                onSelect={(id) => setSelectedPinId(id)}
                selectedPin={selectedPin}
              />
            )}

            {rightTab === "takes" && (
              <TeamTakesPanel takes={takes} take={take} onSubmit={addTeamTake} />
            )}

            {rightTab === "findings" && <FindingsPanel frame={frame} />}
          </aside>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---------------------------------------------------

function ScoreBadge({
  label,
  score,
  primary,
  hint,
}: {
  label: string;
  score: number | null;
  primary?: boolean;
  hint?: string;
}) {
  const color = score !== null ? getScoreColor(score) : "#444";
  return (
    <div
      className={`border ${
        primary ? "border-ladder-green/40 bg-ladder-green/[0.04]" : "border-[#333] bg-[#1e1e1e]"
      } px-4 py-2 min-w-[110px]`}
    >
      <p className="text-[9px] text-muted uppercase tracking-widest mb-1">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span
          className="text-xl font-bold tabular-nums"
          style={{ color }}
        >
          {score !== null ? score.toFixed(1) : "—"}
        </span>
        {hint && (
          <span className="text-[10px] text-muted font-sans">{hint}</span>
        )}
      </div>
    </div>
  );
}

function DeltaBadge({ lift }: { lift: number }) {
  const positive = lift > 0;
  return (
    <div className="border border-[#333] bg-[#1e1e1e] px-4 py-2 min-w-[90px]">
      <p className="text-[9px] text-muted uppercase tracking-widest mb-1">
        Lift
      </p>
      <span
        className={`text-xl font-bold tabular-nums ${
          positive
            ? "text-ladder-green"
            : lift < 0
            ? "text-ladder-red"
            : "text-muted"
        }`}
      >
        {positive ? "↑" : lift < 0 ? "↓" : "±"}
        {Math.abs(lift).toFixed(1)}
      </span>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 text-[10px] font-mono uppercase tracking-widest py-3 transition-colors border-b-2 ${
        active
          ? "border-ladder-green text-foreground"
          : "border-transparent text-muted hover:text-foreground"
      }`}
    >
      {children}
      {typeof count === "number" && (
        <span className="ml-1.5 tabular-nums text-muted">({count})</span>
      )}
    </button>
  );
}

function PinMarker({
  pin,
  index,
  selected,
  onSelect,
}: {
  pin: MockPin;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-semibold transition-all border-2 ${
        pin.resolved
          ? "bg-[#1a1a1a] border-[#3a3a3a] text-muted line-through"
          : selected
          ? "bg-ladder-green text-background border-white scale-110 shadow-lg shadow-ladder-green/40"
          : "bg-ladder-green/90 text-background border-white/80 hover:scale-110"
      }`}
      aria-label={`Pin ${index} by ${pin.author.name}`}
      title={pin.comment}
    >
      {index}
    </button>
  );
}

function PendingPinMarker({
  x,
  y,
  index,
}: {
  x: number;
  y: number;
  index: number;
}) {
  return (
    <div
      style={{ left: `${x}%`, top: `${y}%` }}
      className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-semibold bg-ladder-green/30 border-2 border-dashed border-ladder-green text-ladder-green animate-pulse pointer-events-none"
      aria-label="New pin awaiting comment"
    >
      {index}
    </div>
  );
}

function PinPanel({
  pins,
  selectedPinId,
  onSelect,
  selectedPin,
}: {
  pins: MockPin[];
  selectedPinId: string | null;
  onSelect: (id: string) => void;
  selectedPin: MockPin | null;
}) {
  return (
    <div className="space-y-4">
      {/* Selected pin thread */}
      {selectedPin && (
        <div className="border border-ladder-green/30 bg-ladder-green/[0.04] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Avatar reviewer={selectedPin.author} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xs font-semibold text-foreground font-sans">
                  {selectedPin.author.name}
                </span>
                <span className="text-[10px] text-muted">
                  {timeAgo(selectedPin.createdAt)}
                </span>
              </div>
              <p className="text-xs text-body font-sans leading-relaxed">
                {selectedPin.comment}
              </p>
            </div>
          </div>
          {selectedPin.replies.map((r) => (
            <div key={r.id} className="flex items-start gap-3 pl-3 border-l border-ladder-green/20 ml-2">
              <Avatar reviewer={r.author} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-semibold text-foreground font-sans">
                    {r.author.name}
                  </span>
                  <span className="text-[10px] text-muted">
                    {timeAgo(r.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-body font-sans leading-relaxed">
                  {r.text}
                </p>
              </div>
            </div>
          ))}
          <div className="pt-2 border-t border-[#2a2a2a]">
            <input
              type="text"
              placeholder="Reply to this pin..."
              className="w-full bg-transparent border-none outline-none text-xs text-foreground font-sans placeholder:text-muted"
            />
          </div>
          {selectedPin.resolved && (
            <p className="text-[10px] text-muted font-mono uppercase tracking-widest">
              Resolved
            </p>
          )}
        </div>
      )}

      {/* All pins list */}
      <div>
        <p className="text-[10px] text-muted uppercase tracking-widest mb-2">
          All pins
        </p>
        <div className="space-y-1.5">
          {pins.map((pin, idx) => (
            <button
              key={pin.id}
              type="button"
              onClick={() => onSelect(pin.id)}
              className={`w-full text-left p-2.5 border transition-colors ${
                selectedPinId === pin.id
                  ? "border-ladder-green/40 bg-ladder-green/[0.04]"
                  : "border-[#2a2a2a] bg-[#1a1a1a] hover:bg-[#1f1f1f]"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-mono font-semibold flex items-center justify-center ${
                    pin.resolved
                      ? "bg-[#222] text-muted"
                      : "bg-ladder-green/90 text-background"
                  }`}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-[11px] text-foreground font-semibold font-sans">
                      {pin.author.name}
                    </span>
                    <span className="text-[9px] text-muted">
                      {timeAgo(pin.createdAt)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted font-sans line-clamp-2 leading-snug">
                    {pin.comment}
                  </p>
                  {pin.resolved && (
                    <span className="inline-block mt-1 text-[9px] font-mono uppercase tracking-widest text-muted">
                      Resolved
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted font-sans mt-3 leading-relaxed">
          Click anywhere on the screen above to drop a new pin.
        </p>
      </div>
    </div>
  );
}

function TeamTakesPanel({
  takes,
  take,
  onSubmit,
}: {
  takes: MockTeamTake[];
  take: number | null;
  onSubmit: (score: number, rationale: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState("3.0");
  const [rationale, setRationale] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(score);
    if (!Number.isFinite(n) || n < 1 || n > 5 || !rationale.trim()) return;
    onSubmit(Math.round(n * 10) / 10, rationale.trim());
    setSubmitting(false);
    setScore("3.0");
    setRationale("");
  }

  return (
    <div className="space-y-4">
      <div className="border border-[#333] bg-[#1e1e1e] p-4">
        <p className="text-[10px] text-muted uppercase tracking-widest mb-1">
          Team Take average
        </p>
        <div className="flex items-baseline gap-2">
          <span
            className="text-2xl font-bold tabular-nums"
            style={{ color: take !== null ? getScoreColor(take) : "#444" }}
          >
            {take !== null ? take.toFixed(1) : "—"}
          </span>
          <span className="text-xs text-muted font-sans">
            {takes.length} peer{takes.length !== 1 ? "s" : ""}
          </span>
        </div>
        <p className="text-[10px] text-muted font-sans mt-2 leading-relaxed">
          Peer scores. Independent of Ladder. Same scale.
        </p>
      </div>

      <div className="space-y-2">
        {takes.map((t) => (
          <div
            key={t.id}
            className="border border-[#2a2a2a] bg-[#1a1a1a] p-3"
          >
            <div className="flex items-start gap-3">
              <Avatar reviewer={t.author} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-foreground font-sans">
                    {t.author.name}
                  </span>
                  <span
                    className="text-base font-bold tabular-nums"
                    style={{ color: getScoreColor(t.score) }}
                  >
                    {t.score.toFixed(1)}
                  </span>
                </div>
                <p className="text-[11px] text-muted font-sans leading-relaxed">
                  {t.rationale}
                </p>
                <p className="text-[10px] text-muted font-mono mt-1.5">
                  {timeAgo(t.createdAt)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {submitting ? (
        <form
          onSubmit={handleSubmit}
          className="border border-ladder-green/40 bg-ladder-green/[0.04] p-3 space-y-3"
        >
          <div>
            <label className="block text-[10px] text-muted uppercase tracking-widest mb-1.5">
              Your score (1.0 – 5.0)
            </label>
            <input
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="w-24 bg-[#1a1a1a] border border-[#2a2a2a] focus:border-ladder-green/50 outline-none px-3 py-2 text-sm text-foreground font-mono tabular-nums transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] text-muted uppercase tracking-widest mb-1.5">
              Rationale
            </label>
            <textarea
              autoFocus
              rows={3}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="One line on why you scored it that way."
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] focus:border-ladder-green/50 outline-none px-3 py-2 text-xs text-foreground font-sans placeholder:text-muted transition-colors resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!rationale.trim()}
              className="text-[10px] font-semibold uppercase tracking-widest bg-ladder-green text-background px-3 py-1.5 hover:bg-ladder-green-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Submit Take
            </button>
            <button
              type="button"
              onClick={() => setSubmitting(false)}
              className="text-[10px] font-semibold uppercase tracking-widest text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setSubmitting(true)}
          className="w-full text-[11px] font-semibold uppercase tracking-widest border border-ladder-green/40 bg-ladder-green/[0.04] text-ladder-green hover:bg-ladder-green/10 py-2.5 transition-colors"
        >
          + Submit your Team Take
        </button>
      )}
    </div>
  );
}

function FindingsPanel({ frame }: { frame: MockFrame }) {
  return (
    <div className="space-y-2">
      {frame.findings.map((f) => (
        <div key={f.id} className="border border-[#2a2a2a] bg-[#1a1a1a] p-3">
          <div className="flex items-start justify-between gap-3 mb-1">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted">
              {f.category}
            </span>
            <span className="text-[10px] font-mono text-ladder-green tabular-nums">
              +{f.lift.toFixed(1)}
            </span>
          </div>
          <p className="text-xs text-foreground font-sans font-semibold mb-1">
            {f.title}
          </p>
          <p className="text-[11px] text-muted font-sans leading-relaxed mb-2">
            {f.detail}
          </p>
          {f.threads.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[#2a2a2a] space-y-2">
              {f.threads.map((t) => (
                <div key={t.id} className="flex items-start gap-2">
                  <Avatar reviewer={t.author} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-[11px] text-foreground font-semibold font-sans">
                        {t.author.name}
                      </span>
                      <span className="text-[9px] text-muted">
                        {timeAgo(t.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted font-sans leading-relaxed">
                      {t.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Avatar({
  reviewer,
  size = "md",
}: {
  reviewer: { initials: string; role: "owner" | "key" | "viewer" };
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "w-6 h-6 text-[9px]" : "w-7 h-7 text-[10px]";
  const ring =
    reviewer.role === "owner"
      ? "border-ladder-green"
      : reviewer.role === "key"
      ? "border-ladder-green/40"
      : "border-[#3a3a3a]";
  return (
    <div
      className={`${dim} flex-shrink-0 rounded-full border ${ring} bg-[#1e1e1e] font-mono font-semibold text-foreground flex items-center justify-center`}
    >
      {reviewer.initials}
    </div>
  );
}
