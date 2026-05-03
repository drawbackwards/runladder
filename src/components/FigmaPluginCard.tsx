"use client";

const FIGMA_PLUGIN_URL = "https://www.figma.com/community/plugin/ladder";

function NumberedStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 mb-5 last:mb-0">
      <span className="text-[10px] text-ladder-green font-mono tabular-nums shrink-0 mt-1">
        {String(n).padStart(2, "0")}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground font-sans font-semibold mb-2">
          {title}
        </p>
        {children}
      </div>
    </div>
  );
}

/**
 * Dashboard installer card for the Ladder for Figma plugin.
 * Three steps mirror the Skill install flow — same token, different surface.
 * Sits alongside SkillTokenCard in the dashboard sidebar.
 */
export function FigmaPluginCard() {
  return (
    <div className="border border-[#333] bg-[#1e1e1e] p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] text-ladder-green uppercase tracking-widest font-semibold">
            New
          </span>
          <h3 className="text-sm text-foreground font-sans font-semibold">
            Ladder for Figma
          </h3>
        </div>
        <p className="text-xs text-muted font-sans leading-relaxed">
          Score frames inside Figma without leaving the canvas. Same framework,
          same calibration, same per-rung breakdown.
        </p>
      </div>

      <NumberedStep n={1} title="Get your Ladder token">
        <p className="text-[11px] text-muted font-sans leading-relaxed">
          Use the <span className="text-foreground font-semibold">Ladder for Claude</span> card
          below — generate a token, then click{" "}
          <span className="text-foreground font-semibold">Copy raw token</span>.
          The same token works for both surfaces.
        </p>
      </NumberedStep>

      <NumberedStep n={2} title="Install the plugin">
        <a
          href={FIGMA_PLUGIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-[11px] uppercase tracking-widest text-[#1a1a1a] bg-ladder-green hover:bg-ladder-green/90 transition-colors px-4 py-2 font-semibold"
        >
          Open in Figma Community →
        </a>
        <p className="text-[10px] text-muted font-sans mt-3 leading-relaxed">
          Click <span className="text-foreground">Open in…</span> in Figma Community to
          install into your account. Available in any Figma file under{" "}
          <code className="text-foreground">Plugins → Ladder for Figma</code>.
        </p>
      </NumberedStep>

      <NumberedStep n={3} title="Paste your token">
        <p className="text-[11px] text-muted font-sans leading-relaxed">
          Open the plugin. Paste your Ladder token in the auth screen, click{" "}
          <span className="text-foreground font-semibold">Continue</span>, and you&apos;re in.
          Select any frame and hit <span className="text-foreground font-semibold">Score</span>.
        </p>
      </NumberedStep>

      <div className="mt-6 pt-5 border-t border-[#333]">
        <p className="text-[10px] text-muted font-sans leading-relaxed">
          Scores from the plugin sync to your dashboard automatically. The free
          5-score lifetime cap is shared across web, Skill, and Figma.
        </p>
      </div>
    </div>
  );
}
