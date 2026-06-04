import type { ReactNode } from "react";

/**
 * Section eyebrow label — the small mono, uppercase, muted heading used above
 * cards and sections (e.g. "Design rhythm", "Score history", "Members",
 * "Team performance").
 *
 * Use this instead of an <h2>/<h3>. The global `h1–h6 { color: foreground }`
 * rule in globals.css is *unlayered*, so it overrides Tailwind's `text-muted`
 * (which lives in `@layer utilities`) regardless of specificity — meaning a
 * heading element renders in the foreground color, not muted. A <span> isn't
 * touched by that rule, so this keeps every section label consistently muted.
 *
 * Renders as a block so it sits on its own line; inside a flex row it behaves
 * as a normal flex item. Pass `className` for spacing (e.g. "mb-3").
 */
export function SectionLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`block text-[10px] text-muted uppercase tracking-widest ${className}`}
    >
      {children}
    </span>
  );
}
