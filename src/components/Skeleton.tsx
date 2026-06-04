/**
 * Reusable loading skeleton — a shimmering placeholder block.
 *
 * Pass Tailwind sizing/shape classes via `className` (e.g. "h-4 w-32"). The
 * animation and base color come from the `.shimmer` utility in globals.css, so
 * this component is the single place to evolve skeleton styling app-wide.
 * Prefer this over hand-rolling `<div className="shimmer …" />`.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer ${className}`} aria-hidden="true" />;
}

/**
 * N stacked skeleton lines, for list/card loading states. `rowClassName` sets
 * each line's height/shape; `className` sets the wrapper (gap, etc.).
 */
export function SkeletonRows({
  rows = 3,
  rowClassName = "h-16",
  className = "space-y-1.5",
}: {
  rows?: number;
  rowClassName?: string;
  className?: string;
}) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={rowClassName} />
      ))}
    </div>
  );
}
