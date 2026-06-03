"use client";

import { useState, type ReactNode } from "react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useSkillInstall } from "@/components/skill/useSkillInstall";

const TROUBLESHOOTING: { title: string; body: ReactNode }[] = [
  {
    title: "Token invalid (401)",
    body: "Your connection was reset or never saved. Use Reset above, then re-run the install command.",
  },
  {
    title: "Free limit reached (429)",
    body: (
      <>
        You&apos;ve used all 5 free Ladder scores.{" "}
        <a href="/pricing" className="text-ladder-green hover:underline">
          Upgrade to Pro
        </a>{" "}
        for 2,000 scores per month.
      </>
    ),
  },
];

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/**
 * Ladder for Claude detail page. Left: pitch + screenshot. Right: a status box
 * (connection state only — no instructions) plus two self-contained install
 * boxes, one per path (Claude Code / VS Code, and Claude.ai).
 */
export default function ClaudeDetailPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const skill = useSkillInstall();
  const [troubleshootOpen, setTroubleshootOpen] = useState(false);

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  const stepNum = "text-foreground";

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Link
          href="/dashboard"
          className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl text-foreground font-sans mt-4 mb-8">
          Ladder for Claude
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
          <main>
            {/* Hero — placeholder until we drop in a real screenshot. */}
            <div className="aspect-[16/9] border border-[#2a2a2a] bg-[#161616] flex items-center justify-center mb-6">
              <span className="text-[10px] uppercase tracking-widest text-muted">
                Skill screenshot
              </span>
            </div>
            <div className="space-y-4 text-sm text-muted font-sans leading-relaxed">
              <p>
                Ladder for Claude is a Skill that scores any UI screenshot
                against the Ladder framework, right inside Claude, whether you
                work in Claude Code, Claude.ai, or VS Code. Install it once, then
                screenshot a screen and say &ldquo;Run Ladder&rdquo; to get a
                score and ranked findings without leaving your conversation.
              </p>
              <p>
                Drop in any screenshot, whether it&apos;s a Figma export, a
                localhost grab, or a competitor&apos;s screen, and get a Ladder
                Score from Functional to Meaningful, with findings ranked by
                impact and a clear path to the next level.
              </p>
              <p>
                Because it runs inside Claude, you can go deeper in the same
                conversation. Ask why a finding matters, request a copy rewrite
                or an accessibility pass, then paste a revised screen to rescore
                and track your progress.
              </p>
              <p>
                There are two ways to install, depending on where you use Claude.
                Pick the one that matches your setup.
              </p>
            </div>
          </main>

          <aside className="space-y-4">
            {/* Status box — connection state only, no instructions. */}
            <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5">
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <div className="flex items-baseline gap-2 min-w-0">
                  <h3 className="text-sm text-foreground font-sans font-semibold">
                    Claude skill
                  </h3>
                  {skill.version && (
                    <span className="text-[10px] font-mono text-muted">
                      v{skill.version}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[9px] uppercase tracking-widest font-semibold ${
                    skill.connected ? "text-ladder-green" : "text-muted"
                  }`}
                >
                  {skill.loading
                    ? ""
                    : skill.connected
                      ? "Connected"
                      : "Not connected"}
                </span>
              </div>

              {skill.loading ? (
                <div className="h-4 shimmer mt-2" />
              ) : skill.connected ? (
                <>
                  <p className="text-xs text-muted font-sans">
                    {skill.lastUsedAt
                      ? `Last scored ${relativeTime(skill.lastUsedAt)}.`
                      : "Connected."}
                  </p>
                  {skill.updateAvailable && (
                    <div className="mt-3 border border-ladder-green/30 bg-ladder-green/5 px-3 py-2.5">
                      <span className="text-[11px] text-muted font-sans">
                        Update available:{" "}
                        <span className="font-mono text-foreground">
                          v{skill.installedVersion}
                        </span>
                        {" → "}
                        <span className="font-mono text-foreground">
                          v{skill.version}
                        </span>
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={skill.reset}
                      disabled={skill.working}
                      className="text-[10px] uppercase tracking-widest text-muted border border-[#333] px-3 py-1.5 hover:border-muted hover:text-foreground transition-colors disabled:opacity-40"
                    >
                      Reset
                    </button>
                    <button
                      onClick={skill.disconnect}
                      disabled={skill.working}
                      className="text-[10px] uppercase tracking-widest text-ladder-red border border-[#333] px-3 py-1.5 hover:border-ladder-red/50 transition-colors disabled:opacity-40"
                    >
                      Disconnect
                    </button>
                  </div>

                  <div className="mt-4 border-t border-[#2a2a2a] pt-3">
                    <button
                      type="button"
                      onClick={() => setTroubleshootOpen(!troubleshootOpen)}
                      className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
                      aria-expanded={troubleshootOpen}
                    >
                      {troubleshootOpen
                        ? "Hide troubleshooting"
                        : "Troubleshooting"}
                      <svg
                        className={`transition-transform ${
                          troubleshootOpen ? "rotate-180" : ""
                        }`}
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    {troubleshootOpen && (
                      <ul className="space-y-3 pt-3">
                        {TROUBLESHOOTING.map((item, i) => (
                          <li key={i}>
                            <p className="text-[11px] text-foreground font-sans font-semibold">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-muted font-sans mt-1 leading-relaxed">
                              {item.body}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted font-sans">
                  Not connected yet — follow the steps below to install.
                </p>
              )}
            </div>

            {/* Install path 1: Claude Code / VS Code */}
            <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5">
              <h3 className="text-sm text-foreground font-sans font-semibold mb-3">
                Claude Code / VS Code
              </h3>
              <ol className="space-y-2 text-xs text-muted font-sans leading-relaxed mb-4">
                <li>
                  <span className={stepNum}>1.</span> Copy the install command
                  below.
                </li>
                <li>
                  <span className={stepNum}>2.</span> Paste it into your Terminal
                  and run it — it saves your access and installs the skill in one
                  step.
                </li>
                <li>
                  <span className={stepNum}>3.</span> Screenshot a UI in any
                  Claude conversation and say &ldquo;Run Ladder.&rdquo;
                </li>
              </ol>
              <button
                onClick={skill.command ? skill.copyCommand : skill.reset}
                disabled={skill.working}
                className="text-[11px] uppercase tracking-widest text-[#1a1a1a] bg-ladder-green hover:bg-ladder-green/90 transition-colors px-4 py-2 font-semibold disabled:opacity-40"
              >
                {skill.working
                  ? "Preparing…"
                  : skill.command
                    ? skill.copied
                      ? "Copied"
                      : "Copy install command"
                    : "Get install command"}
              </button>
            </div>

            {/* Install path 2: Claude.ai */}
            <div className="border border-[#2a2a2a] bg-[#1a1a1a] p-5">
              <h3 className="text-sm text-foreground font-sans font-semibold mb-3">
                Claude.ai
              </h3>
              <ol className="space-y-2 text-xs text-muted font-sans leading-relaxed mb-4">
                <li>
                  <span className={stepNum}>1.</span> Download the SKILL.md file
                  below.
                </li>
                <li>
                  <span className={stepNum}>2.</span> Add it to a Claude Project.
                </li>
                <li>
                  <span className={stepNum}>3.</span> Screenshot a UI and say
                  &ldquo;Run Ladder.&rdquo;
                </li>
              </ol>
              <a
                href={skill.downloadUrl}
                className="inline-block text-[11px] uppercase tracking-widest text-[#1a1a1a] bg-ladder-green hover:bg-ladder-green/90 transition-colors px-4 py-2 font-semibold"
              >
                Download SKILL.md File
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
