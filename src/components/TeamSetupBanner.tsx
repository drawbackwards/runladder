import Link from "next/link";

/**
 * First-time team setup prompt on the main dashboard. Presentational only —
 * the dashboard decides when to render it: shown to a Team Lead (org:admin)
 * whose team is still empty (no designers invited yet), and hidden once they
 * invite their first member. See `src/app/dashboard/page.tsx`.
 */
export function TeamSetupBanner() {
  return (
    <div className="bg-ladder-green p-8 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-end">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-[#0a1a14]/70 font-semibold mb-3">
            Team leader
          </p>
          <h3 className="text-2xl text-[#1a1a1a] font-sans font-semibold mb-3 tracking-tight">
            Set up your team
          </h3>
          <p className="text-sm text-[#0a1a14]/80 font-sans leading-relaxed max-w-2xl">
            You&apos;re set up to lead a team on Ladder. Create your team to invite
            your designers, see their scores and letter grades, and unlock manager
            insights. Designers you invite get team-tier access automatically.
          </p>
        </div>
        <Link
          href="/dashboard/team"
          className="bg-[#1a1a1a] text-white text-xs font-semibold uppercase tracking-widest px-8 py-3 hover:bg-[#1a1a1a]/90 transition-colors flex-shrink-0 whitespace-nowrap justify-self-start md:justify-self-end"
        >
          Create your team →
        </Link>
      </div>
    </div>
  );
}
