"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { AnnotationFinding } from "@/lib/evaluation";

type Props = {
  imageDataUrl: string;
  findings: AnnotationFinding[];
  displayWidth?: number;
  onFindingEdit?: (id: string, field: "humanNote" | "fix" | "issue", value: string) => void;
  readOnly?: boolean;
};

const MARGIN_W = 220;
const STEM = 14;
const MIN_SLOT = 76;

type AnnotationLayout = {
  id: string;
  finding: AnnotationFinding;
  pinX: number;
  pinY: number;
  elbowY: number;
  exitX: number;
  textY: number;
  side: "left" | "right";
};

type PinOverride = { xPct: number; yPct: number };

function layoutOne(
  f: AnnotationFinding,
  imgW: number,
  imgH: number,
  pinOverride?: PinOverride,
  side?: "left" | "right",
): Omit<AnnotationLayout, "textY"> & { naturalTextY: number } {
  const xPct = pinOverride?.xPct ?? f.xPercent;
  const yPct = pinOverride?.yPct ?? f.yPercent;
  const pinX = xPct * imgW;
  const pinY = yPct * imgH;
  const resolvedSide: "left" | "right" = side ?? (xPct < 0.5 ? "left" : "right");
  const exitX = resolvedSide === "left" ? -8 : imgW + 8;
  const dx = Math.abs(pinX - exitX);
  const goUp = yPct >= 0.5;
  const elbowY = goUp ? pinY - STEM : pinY + STEM;
  const naturalTextY = goUp ? elbowY - dx : elbowY + dx;
  return { id: f.id, finding: f, pinX, pinY, elbowY, exitX, naturalTextY, side: resolvedSide };
}

function computeLayout(
  findings: AnnotationFinding[],
  imgW: number,
  imgH: number,
  pinOverrides: Record<string, PinOverride>,
  // sideOverrides: keep pin on its original side even after dragging across centre
  sideOverrides: Record<string, "left" | "right">,
): AnnotationLayout[] {
  const items = findings.map((f) =>
    layoutOne(f, imgW, imgH, pinOverrides[f.id], sideOverrides[f.id]),
  );

  // Resolve text-block collisions per side using natural positions
  const layouts: AnnotationLayout[] = items.map((item) => ({
    ...item,
    textY: item.naturalTextY,
  }));

  for (const s of ["left", "right"] as const) {
    const side = layouts.filter((l) => l.side === s).sort((a, b) => a.textY - b.textY);
    for (let i = 1; i < side.length; i++) {
      if (side[i].textY < side[i - 1].textY + MIN_SLOT) {
        side[i].textY = side[i - 1].textY + MIN_SLOT;
      }
    }
  }

  return layouts;
}

const SEVERITY_COLOR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f97316",
  low: "#eab308",
};

export function AnnotatedScreen({
  imageDataUrl,
  findings,
  displayWidth = 620,
  onFindingEdit,
  readOnly = false,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [imgH, setImgH] = useState<number | null>(null);

  // Per-finding pin position overrides (dragging the pin)
  const [pinOverrides, setPinOverrides] = useState<Record<string, PinOverride>>({});
  // Keep side stable once set, so pin doesn't flip margin when crossing centre
  const [sideOverrides, setSideOverrides] = useState<Record<string, "left" | "right">>({});
  // Per-finding text-block Y overrides (dragging the label)
  const [textYOverrides, setTextYOverrides] = useState<Record<string, number>>({});

  const pinDragging = useRef<{ id: string } | null>(null);
  const textDragging = useRef<{ id: string; startMouseY: number; startTextY: number } | null>(null);

  // Reset all manual positions when findings are replaced by a new analysis run
  const findingsKey = findings.map((f) => f.id).join(",");
  useEffect(() => {
    setPinOverrides({});
    setSideOverrides({});
    setTextYOverrides({});
  }, [findingsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const measureImage = useCallback(() => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    setImgH(Math.round(displayWidth * (img.naturalHeight / img.naturalWidth)));
  }, [displayWidth]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth) measureImage();
  }, [measureImage]);

  // Global mouse handlers — handle both pin drag and text-block drag
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (pinDragging.current && svgRef.current && imgH) {
        const rect = svgRef.current.getBoundingClientRect();
        const xPct = Math.max(0.02, Math.min(0.98, (e.clientX - rect.left) / rect.width));
        const yPct = Math.max(0.02, Math.min(0.98, (e.clientY - rect.top) / rect.height));
        setPinOverrides((prev) => ({ ...prev, [pinDragging.current!.id]: { xPct, yPct } }));
      }
      if (textDragging.current) {
        const delta = e.clientY - textDragging.current.startMouseY;
        setTextYOverrides((prev) => ({
          ...prev,
          [textDragging.current!.id]: textDragging.current!.startTextY + delta,
        }));
      }
    }
    function onUp() {
      pinDragging.current = null;
      textDragging.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [imgH]);

  function startPinDrag(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    // Lock the side at drag start so label doesn't jump margins
    const current = findings.find((f) => f.id === id);
    if (current && !sideOverrides[id]) {
      const xPct = pinOverrides[id]?.xPct ?? current.xPercent;
      setSideOverrides((prev) => ({ ...prev, [id]: xPct < 0.5 ? "left" : "right" }));
    }
    pinDragging.current = { id };
  }

  function startTextDrag(id: string, currentTextY: number, e: React.MouseEvent) {
    e.preventDefault();
    textDragging.current = { id, startMouseY: e.clientY, startTextY: currentTextY };
  }

  const baseLayout = imgH
    ? computeLayout(findings, displayWidth, imgH, pinOverrides, sideOverrides)
    : [];

  // Apply text-block Y overrides on top of collision-resolved positions
  const layout = baseLayout.map((a) => ({
    ...a,
    textY: textYOverrides[a.id] ?? a.textY,
  }));

  const totalWidth = MARGIN_W + displayWidth + MARGIN_W;

  return (
    <div style={{ width: totalWidth, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {/* Left margin */}
        <div style={{ width: MARGIN_W, flexShrink: 0, position: "relative", height: imgH ?? "auto" }}>
          {layout
            .filter((a) => a.side === "left")
            .map((a) => (
              <AnnotationTextBlock
                key={a.id}
                annotation={a}
                side="left"
                onEdit={onFindingEdit}
                readOnly={readOnly}
                onDragStart={(e) => startTextDrag(a.id, a.textY, e)}
              />
            ))}
        </div>

        {/* Image + SVG overlay */}
        <div style={{ width: displayWidth, flexShrink: 0, position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageDataUrl}
            alt="Screen"
            onLoad={measureImage}
            style={{ width: "100%", display: "block" }}
          />
          {imgH && (
            <svg
              ref={svgRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: displayWidth,
                height: imgH,
                overflow: "visible",
              }}
              viewBox={`0 0 ${displayWidth} ${imgH}`}
            >
              {layout.map((a) => {
                const color = SEVERITY_COLOR[a.finding.severity] ?? "#ef4444";
                const points = `${a.pinX},${a.pinY} ${a.pinX},${a.elbowY} ${a.exitX},${a.textY}`;
                return (
                  <g key={a.id}>
                    {/* Lines — no pointer events */}
                    <polyline
                      points={points}
                      stroke={color}
                      strokeWidth={1}
                      fill="none"
                      opacity={0.7}
                      style={{ pointerEvents: "none" }}
                    />
                    <line
                      x1={a.exitX}
                      y1={a.textY}
                      x2={a.side === "left" ? a.exitX - 12 : a.exitX + 12}
                      y2={a.textY}
                      stroke={color}
                      strokeWidth={1}
                      opacity={0.7}
                      style={{ pointerEvents: "none" }}
                    />
                    {/* Pin — draggable */}
                    <circle
                      cx={a.pinX}
                      cy={a.pinY}
                      r={10}
                      fill="transparent"
                      style={{ cursor: readOnly ? "default" : "move", pointerEvents: readOnly ? "none" : "all" }}
                      onMouseDown={readOnly ? undefined : (e) => startPinDrag(a.id, e)}
                    />
                    <circle
                      cx={a.pinX}
                      cy={a.pinY}
                      r={5}
                      fill={color}
                      opacity={0.9}
                      style={{ pointerEvents: "none" }}
                    />
                    <circle
                      cx={a.pinX}
                      cy={a.pinY}
                      r={3}
                      fill={color}
                      style={{ pointerEvents: "none" }}
                    />
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Right margin */}
        <div style={{ width: MARGIN_W, flexShrink: 0, position: "relative", height: imgH ?? "auto" }}>
          {layout
            .filter((a) => a.side === "right")
            .map((a) => (
              <AnnotationTextBlock
                key={a.id}
                annotation={a}
                side="right"
                onEdit={onFindingEdit}
                readOnly={readOnly}
                onDragStart={(e) => startTextDrag(a.id, a.textY, e)}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

function AnnotationTextBlock({
  annotation: a,
  side,
  onEdit,
  readOnly,
  onDragStart,
}: {
  annotation: AnnotationLayout;
  side: "left" | "right";
  onEdit?: (id: string, field: "humanNote" | "fix" | "issue", value: string) => void;
  readOnly?: boolean;
  onDragStart: (e: React.MouseEvent) => void;
}) {
  const color = SEVERITY_COLOR[a.finding.severity] ?? "#ef4444";

  return (
    <div
      style={{
        position: "absolute",
        top: a.textY - 10,
        ...(side === "left" ? { right: 16, textAlign: "right" } : { left: 16, textAlign: "left" }),
        width: MARGIN_W - 28,
      }}
    >
      {/* Title — drag handle for vertical repositioning */}
      <div
        onMouseDown={readOnly ? undefined : onDragStart}
        style={{
          color,
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 2,
          cursor: readOnly ? "default" : "ns-resize",
          userSelect: "none",
        }}
        title={readOnly ? undefined : "Drag to reposition"}
      >
        {a.finding.title}
      </div>

      {readOnly ? (
        <>
          <p style={{ fontSize: 11, color: "#aaa", margin: "2px 0", lineHeight: 1.4 }}>
            {a.finding.issue}
          </p>
          <p style={{ fontSize: 11, color: "#666", margin: "2px 0", lineHeight: 1.4 }}>
            → {a.finding.fix}
          </p>
          {a.finding.humanNote && (
            <p style={{ fontSize: 11, color: "#6AC89B", margin: "4px 0 0", lineHeight: 1.4 }}>
              {a.finding.humanNote}
            </p>
          )}
        </>
      ) : (
        <div className="space-y-1">
          <textarea
            value={a.finding.issue}
            onChange={(e) => onEdit?.(a.id, "issue", e.target.value)}
            rows={2}
            style={{ fontSize: 11, width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #333", color: "#aaa", resize: "vertical", outline: "none", padding: "2px 0", lineHeight: 1.4 }}
          />
          <textarea
            value={a.finding.fix}
            onChange={(e) => onEdit?.(a.id, "fix", e.target.value)}
            rows={2}
            style={{ fontSize: 11, width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #333", color: "#666", resize: "vertical", outline: "none", padding: "2px 0", lineHeight: 1.4 }}
            placeholder="Fix direction…"
          />
          <textarea
            value={a.finding.humanNote}
            onChange={(e) => onEdit?.(a.id, "humanNote", e.target.value)}
            rows={1}
            style={{ fontSize: 11, width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #333", color: "#6AC89B", resize: "vertical", outline: "none", padding: "2px 0", lineHeight: 1.4 }}
            placeholder="Add note…"
          />
        </div>
      )}
    </div>
  );
}
