const LEVELS = [
  { min: 0, max: 1.99, label: "Functional", color: "text-ladder-red" },
  { min: 2, max: 2.99, label: "Usable", color: "text-ladder-orange" },
  { min: 3, max: 3.99, label: "Comfortable", color: "text-ladder-yellow" },
  { min: 4, max: 4.99, label: "Delightful", color: "text-ladder-delightful" },
  { min: 5, max: 5, label: "Meaningful", color: "text-ladder-white" },
];

function getLevel(score: number) {
  return LEVELS.find((l) => score >= l.min && score <= l.max) ?? LEVELS[0];
}

export function LadderScore({
  score,
  size = "lg",
}: {
  score: number;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const level = getLevel(score);

  const sizes = {
    sm: { score: "text-2xl", label: "text-xs" },
    md: { score: "text-4xl", label: "text-sm" },
    lg: { score: "text-6xl", label: "text-base" },
    xl: { score: "text-8xl", label: "text-lg" },
  };

  const s = sizes[size];

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`font-mono font-bold ${s.score} ${level.color}`}>
        {score.toFixed(1)}
      </span>
      <span className={`font-mono ${s.label} ${level.color} opacity-70`}>
        {level.label}
      </span>
    </div>
  );
}

export function LadderMeter({ score }: { score: number }) {
  const level = getLevel(score);
  const pct = (score / 5) * 100;

  const colorMap: Record<string, string> = {
    "text-ladder-red": "bg-ladder-red",
    "text-ladder-orange": "bg-ladder-orange",
    "text-ladder-yellow": "bg-ladder-yellow",
    "text-ladder-delightful": "bg-ladder-delightful",
    "text-ladder-white": "bg-ladder-white",
  };

  const bgColor = colorMap[level.color] ?? "bg-ladder-green";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className={`font-mono text-sm font-bold ${level.color}`}>
          {score.toFixed(1)}
        </span>
        <span className={`font-mono text-xs ${level.color} opacity-70`}>
          {level.label}
        </span>
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full ${bgColor} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
