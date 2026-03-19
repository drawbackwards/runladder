import { getLevelForScore } from "@/lib/ladder";

export function LadderScore({
  score,
  size = "lg",
}: {
  score: number;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const level = getLevelForScore(score);

  const sizes = {
    sm: { score: "text-2xl", label: "text-xs" },
    md: { score: "text-4xl", label: "text-sm" },
    lg: { score: "text-6xl", label: "text-base" },
    xl: { score: "text-8xl", label: "text-lg" },
  };

  const s = sizes[size];

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`font-mono font-bold ${s.score} ${level.cssText}`}>
        {score.toFixed(1)}
      </span>
      <span className={`font-mono ${s.label} ${level.cssText} opacity-70`}>
        {level.label}
      </span>
    </div>
  );
}

export function LadderMeter({ score }: { score: number }) {
  const level = getLevelForScore(score);
  const pct = (score / 5) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className={`font-mono text-sm font-bold ${level.cssText}`}>
          {score.toFixed(1)}
        </span>
        <span className={`font-mono text-xs ${level.cssText} opacity-70`}>
          {level.label}
        </span>
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full ${level.cssBg} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
