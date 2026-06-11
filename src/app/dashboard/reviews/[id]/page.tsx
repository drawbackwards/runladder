import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  findReviewBySlug,
  iterationsSorted,
  rollupReview,
  teamTakeAverage,
} from "@/lib/reviews/mockData";
import { getScoreColor } from "@/lib/ladder";
import { MockScreen } from "@/components/reviews/MockScreen";

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const review = findReviewBySlug(id);
  if (!review) return { title: "Review not found | Ladder" };
  return {
    title: `${review.name} | Reviews | Ladder`,
    description: review.description,
  };
}

export default async function ReviewDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const review = findReviewBySlug(id);
  if (!review) notFound();

  const roll = rollupReview(review);
  const positive = roll.delta > 0;

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <Link
          href="/dashboard/reviews"
          className="inline-flex items-center gap-2 text-[10px] text-muted uppercase tracking-widest hover:text-foreground transition-colors mb-6"
        >
          ← Reviews
        </Link>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl text-foreground font-sans mb-2">
              {review.name}
            </h1>
            <p className="text-sm text-muted font-sans leading-relaxed max-w-2xl">
              {review.description}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              className="text-[11px] font-semibold uppercase tracking-widest border border-[#3a3a3a] text-foreground px-4 py-2 hover:bg-[#1f1f1f] transition-colors"
            >
              Share
            </button>
            <Link
              href={`/score?review=${review.slug}`}
              className="text-[11px] font-semibold uppercase tracking-widest bg-ladder-green text-background px-5 py-2 hover:bg-ladder-green-light transition-colors"
            >
              + Score a frame
            </Link>
          </div>
        </div>

        {/* Roll-up */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
          <RollupCell
            label="Starting"
            value={roll.startingScore.toFixed(1)}
            valueColor={getScoreColor(roll.startingScore)}
          />
          <RollupCell
            label="Current"
            value={roll.currentScore.toFixed(1)}
            valueColor={getScoreColor(roll.currentScore)}
          />
          <RollupCell
            label="Delta"
            value={`${positive ? "↑" : roll.delta < 0 ? "↓" : "±"}${Math.abs(roll.delta).toFixed(1)}`}
            valueColor={
              positive ? "#6AC89B" : roll.delta < 0 ? "#ef4444" : "#888"
            }
          />
          <RollupCell
            label="Activity"
            value={`${roll.totalIterations} / ${roll.totalPins}`}
            sub="iterations / pins"
          />
        </div>

        {/* Reviewers strip */}
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap border border-[#2a2a2a] bg-[#1a1a1a] px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted uppercase tracking-widest">
              Reviewers
            </span>
            <div className="flex items-center gap-1.5">
              {review.reviewers.map((r) => (
                <div
                  key={r.id}
                  className={`w-7 h-7 rounded-full border ${
                    r.role === "owner"
                      ? "border-ladder-green"
                      : r.role === "key"
                      ? "border-ladder-green/40"
                      : "border-[#3a3a3a]"
                  } bg-[#1e1e1e] text-[10px] font-mono font-semibold text-foreground flex items-center justify-center`}
                  title={`${r.name} (${r.role})`}
                >
                  {r.initials}
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="text-[10px] font-semibold uppercase tracking-widest text-ladder-green hover:text-ladder-green/80 transition-colors"
          >
            + Invite a reviewer
          </button>
        </div>

        {/* Frames */}
        <p className="text-[10px] text-muted uppercase tracking-widest mb-3">
          Frames
        </p>
        <div className="space-y-2">
          {review.frames.map((frame) => {
            const iters = iterationsSorted(frame);
            const start = iters[0]?.score ?? 0;
            const current = iters[iters.length - 1]?.score ?? 0;
            const delta = Math.round((current - start) * 10) / 10;
            const take = teamTakeAverage(frame);
            return (
              <Link
                key={frame.id}
                href={`/dashboard/reviews/${review.slug}/frames/${frame.id}`}
                className="flex items-stretch gap-4 border border-[#2a2a2a] bg-[#1a1a1a] hover:bg-[#1f1f1f] hover:border-[#3a3a3a] transition-colors p-3 group"
              >
                <div className="w-24 flex-shrink-0">
                  <MockScreen hue={frame.hue} name={frame.name} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm text-foreground font-sans mb-0.5">
                      {frame.name}
                    </h3>
                    <p className="text-[10px] text-muted font-sans">
                      {iters.length} iteration{iters.length !== 1 ? "s" : ""} ·{" "}
                      {frame.pins.length} pin{frame.pins.length !== 1 ? "s" : ""} ·{" "}
                      {frame.teamTakes.length} take{frame.teamTakes.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Sparkline values={iters.map((i) => i.score)} />
                </div>
                <div className="flex items-center gap-6 pr-2">
                  <div className="text-right">
                    <p className="text-[9px] text-muted uppercase tracking-widest mb-0.5">
                      Ladder
                    </p>
                    <span
                      className="text-xl font-bold tabular-nums"
                      style={{ color: getScoreColor(current) }}
                    >
                      {current.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-muted uppercase tracking-widest mb-0.5">
                      Team take
                    </p>
                    <span
                      className="text-xl font-bold tabular-nums"
                      style={{ color: take !== null ? getScoreColor(take) : "#444" }}
                    >
                      {take !== null ? take.toFixed(1) : "—"}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-muted uppercase tracking-widest mb-0.5">
                      Delta
                    </p>
                    <span
                      className={`text-base font-mono font-semibold tabular-nums ${
                        delta > 0
                          ? "text-ladder-green"
                          : delta < 0
                          ? "text-ladder-red"
                          : "text-muted"
                      }`}
                    >
                      {delta > 0 ? "↑" : delta < 0 ? "↓" : "±"}
                      {Math.abs(delta).toFixed(1)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RollupCell({
  label,
  value,
  valueColor,
  sub,
}: {
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
}) {
  return (
    <div className="border border-[#333] bg-[#1e1e1e] p-4">
      <p className="text-[9px] text-muted uppercase tracking-widest mb-2">
        {label}
      </p>
      <p
        className="text-2xl font-bold tabular-nums"
        style={{ color: valueColor ?? "#fff" }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[10px] text-muted font-sans mt-1">{sub}</p>
      )}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const w = 120;
  const h = 24;
  const min = 1;
  const max = 5;
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * w;
      const y = h - ((v - min) / (max - min)) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="text-ladder-green"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.map((v, i) => {
        const x = (i / Math.max(1, values.length - 1)) * w;
        const y = h - ((v - min) / (max - min)) * h;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={2}
            fill="currentColor"
          />
        );
      })}
    </svg>
  );
}
