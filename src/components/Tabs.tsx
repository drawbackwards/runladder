"use client";

import Link from "next/link";

/**
 * Shared in-page tab pattern (mono uppercase label, green underline on active,
 * optional count badge). Reused in the team member detail page and the admin
 * layout. Pass `href` to render as a Link (route-based tabs), or `onClick` to
 * render as a button (local state-driven tabs).
 */
export function TabButton({
  label,
  active,
  count,
  badge,
  href,
  onClick,
}: {
  label: string;
  active: boolean;
  count?: number;
  /** Small text tag rendered after the label, e.g. "Beta". */
  badge?: string;
  href?: string;
  onClick?: () => void;
}) {
  const className = `text-[11px] uppercase tracking-widest px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
    active
      ? "text-foreground border-ladder-green"
      : "text-muted border-transparent hover:text-foreground"
  }`;
  const content = (
    <>
      {label}
      {typeof count === "number" && (
        <span
          className={`ml-1 font-mono ${
            active ? "text-ladder-green" : "text-[#3a3a3a]"
          }`}
        >
          {count}
        </span>
      )}
      {badge && (
        <span className="ml-1.5 text-[8px] uppercase tracking-widest text-ladder-green border border-ladder-green/40 bg-ladder-green/5 px-1 py-0.5 leading-none align-middle">
          {badge}
        </span>
      )}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
