/**
 * Static SVG placeholder for a "screen" being scored inside a Review.
 *
 * Renders a generic UI canvas (nav bar, content blocks, CTA) tinted
 * by the frame's hue. Real product will swap this for the actual
 * screenshot. The shape stays the same so peer pins keep their
 * coordinates anchored.
 */

export type MockScreenProps = {
  hue: number;
  name: string;
  iterationLabel?: string;
  className?: string;
};

export function MockScreen({ hue, name, iterationLabel, className }: MockScreenProps) {
  const bg = `hsl(${hue}, 18%, 12%)`;
  const surface = `hsl(${hue}, 14%, 18%)`;
  const surfaceStrong = `hsl(${hue}, 14%, 22%)`;
  const accent = `hsl(${hue}, 55%, 58%)`;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-md border border-[#2a2a2a] ${className ?? ""}`}
      style={{ aspectRatio: "16 / 11", background: bg }}
      aria-label={`Mock screen: ${name}`}
    >
      {/* Faux nav bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4"
        style={{ height: "10%", background: surfaceStrong }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: accent }}
          />
          <div className="h-1.5 w-12 rounded-sm" style={{ background: surface }} />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-6 rounded-sm" style={{ background: surface }} />
          <div className="h-1.5 w-6 rounded-sm" style={{ background: surface }} />
          <div className="h-1.5 w-6 rounded-sm" style={{ background: surface }} />
        </div>
      </div>

      {/* Content blocks */}
      <div className="absolute inset-0 pt-[14%] pb-[18%] px-[6%] flex flex-col gap-[3%]">
        <div
          className="rounded-sm w-[42%]"
          style={{ height: "8%", background: surfaceStrong }}
        />
        <div className="flex gap-[3%] flex-1">
          <div
            className="rounded-md flex-[2]"
            style={{ background: surface }}
          />
          <div className="flex-1 flex flex-col gap-[6%]">
            <div className="h-[16%] rounded-sm" style={{ background: surfaceStrong }} />
            <div className="h-[16%] rounded-sm w-[80%]" style={{ background: surfaceStrong }} />
            <div className="h-[16%] rounded-sm w-[60%]" style={{ background: surfaceStrong }} />
            <div className="flex-1" />
            <div
              className="h-[18%] rounded-sm"
              style={{ background: accent, opacity: 0.85 }}
            />
          </div>
        </div>
      </div>

      {/* Faux footer */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4"
        style={{ height: "8%", background: surfaceStrong }}
      >
        <div className="h-1 w-16 rounded-sm" style={{ background: surface }} />
        <div className="h-1 w-10 rounded-sm" style={{ background: surface }} />
      </div>

      {/* Watermark label */}
      <div className="absolute top-2 right-2 text-[9px] uppercase tracking-widest font-mono text-white/30">
        {iterationLabel ?? name}
      </div>
    </div>
  );
}
