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
 * Two-step install: open in Figma Community, then sign in with the
 * same email used on runladder.com.
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
          Score frames inside Figma without leaving the canvas.
        </p>
      </div>

      <NumberedStep n={1} title="Install the plugin">
        <a
          href={FIGMA_PLUGIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-[11px] uppercase tracking-widest text-[#1a1a1a] bg-ladder-green hover:bg-ladder-green/90 transition-colors px-4 py-2 font-semibold"
        >
          Open in Figma Community →
        </a>
      </NumberedStep>

      <NumberedStep n={2} title="Sign in with your Ladder email">
        <p className="text-[11px] text-muted font-sans leading-relaxed">
          Open the plugin in any Figma file (
          <code className="text-foreground">Plugins → Ladder for Figma</code>) and
          sign in with the same email you use here. Scores sync to your
          dashboard automatically.
        </p>
      </NumberedStep>
    </div>
  );
}
