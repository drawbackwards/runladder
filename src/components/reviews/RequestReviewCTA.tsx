import Link from "next/link";

/**
 * Designer-side entry point for asking a manager for human eyes on a
 * design. Renders on /dashboard so designers see it next to their own
 * recent scores. Manager-side, the request appears on /dashboard/team
 * inside the Review Requests panel.
 */
export function RequestReviewCTA() {
  return (
    <Link
      href="/dashboard/reviews/request"
      className="block border border-ladder-green/30 bg-ladder-green/[0.04] hover:bg-ladder-green/[0.08] hover:border-ladder-green/60 transition-colors p-4 mb-6 group"
    >
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-10 h-10 border border-ladder-green/40 bg-ladder-green/10 flex items-center justify-center">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6AC89B"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground font-sans">
            Ask your team for a review
          </p>
          <p className="text-[11px] text-muted font-sans mt-0.5">
            Send a screen to your manager for human crit. They&apos;ll see it
            on their team dashboard.
          </p>
        </div>
        <span className="text-ladder-green text-base flex-shrink-0 pr-2 group-hover:translate-x-0.5 transition-transform">
          →
        </span>
      </div>
    </Link>
  );
}
