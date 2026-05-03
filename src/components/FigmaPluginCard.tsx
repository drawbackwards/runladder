"use client";

const FIGMA_PLUGIN_URL = "https://www.figma.com/community/plugin/ladder";

/**
 * Dashboard promo card for the Ladder for Figma plugin.
 * Sits alongside SkillTokenCard in the dashboard sidebar.
 */
export function FigmaPluginCard() {
  return (
    <div className="border border-[#333] bg-[#1e1e1e] p-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[9px] text-ladder-green uppercase tracking-widest font-semibold">
          New
        </span>
        <h3 className="text-sm text-foreground font-sans font-semibold">
          Ladder for Figma
        </h3>
      </div>
      <p className="text-xs text-muted font-sans leading-relaxed mb-5">
        Score frames inside Figma without leaving the canvas. Same framework,
        same calibration, same per-rung breakdown — embedded in the tool where
        your design work actually happens.
      </p>

      <ul className="space-y-2 mb-6">
        {[
          "Score any frame, page, or component in place",
          "Per-rung breakdown with ranked findings",
          "Fix suggestions with score uplift estimates",
          "Scores attributed to your Ladder account",
        ].map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-[11px] text-body font-sans leading-relaxed"
          >
            <span className="text-ladder-green mt-0.5 flex-shrink-0">+</span>
            {feature}
          </li>
        ))}
      </ul>

      <a
        href={FIGMA_PLUGIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center text-xs font-semibold bg-ladder-green text-[#1a1a1a] px-6 py-3 hover:bg-ladder-green/90 transition-colors uppercase tracking-widest"
      >
        Install for Figma
      </a>
    </div>
  );
}
