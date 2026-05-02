"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { AnnotationFinding } from "@/lib/evaluation";

type Props = {
  imageDataUrl: string;
  findings: AnnotationFinding[];
  displayWidth?: number;
  onFindingEdit?: (id: string, field: "humanNote" | "fix" | "issue" | "title", value: string) => void;
  onFindingDelete?: (id: string) => void;
  onPinMove?: (id: string, xPct: number, yPct: number) => void;
  addMode?: boolean;
  onAddFinding?: (xPct: number, yPct: number) => void;
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
  onFindingDelete,
  onPinMove,
  addMode = false,
  onAddFinding,
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

  const pinDragging = useRef<{
    id: string;
    startXPct: number;
    startYPct: number;
    currentXPct: number;
    currentYPct: number;
  } | null>(null);
  const textDragging = useRef<{ id: string; startMouseY: number; startTextY: number } | null>(null);
  // Keep onPinMove in a ref so the effect closure always calls the latest version
  // without needing it as a dep (avoids re-registering listeners on every parent render)
  const onPinMoveRef = useRef(onPinMove);
  useEffect(() => { onPinMoveRef.current = onPinMove; });

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
        pinDragging.current.currentXPct = xPct;
        pinDragging.current.currentYPct = yPct;
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
      if (pinDragging.current) {
        const { id, startXPct, startYPct, currentXPct, currentYPct } = pinDragging.current;
        const moved =
          Math.abs(currentXPct - startXPct) > 0.005 ||
          Math.abs(currentYPct - startYPct) > 0.005;
        if (moved) onPinMoveRef.current?.(id, currentXPct, currentYPct);
      }
      pinDragging.current = null;
      textDragging.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [imgH]); // eslint-disable-line react-hooks/exhaustive-deps

  function startPinDrag(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const current = findings.find((f) => f.id === id);
    if (!current) return;
    const xPct = pinOverrides[id]?.xPct ?? current.xPercent;
    const yPct = pinOverrides[id]?.yPct ?? current.yPercent;
    // Lock the side at drag start so label doesn't jump margins
    if (!sideOverrides[id]) {
      setSideOverrides((prev) => ({ ...prev, [id]: xPct < 0.5 ? "left" : "right" }));
    }
    pinDragging.current = { id, startXPct: xPct, startYPct: yPct, currentXPct: xPct, currentYPct: yPct };
  }

  function startTextDrag(id: string, currentTextY: number, e: React.MouseEvent) {
    e.preventDefault();
    textDragging.current = { id, startMouseY: e.clientY, startTextY: currentTextY };
  }

  function handleSvgClick(e: React.MouseEvent<SVGRectElement>) {
    if (!svgRef.current || !imgH || !onAddFinding) return;
    e.stopPropagation();
    const rect = svgRef.current.getBoundingClientRect();
    const xPct = Math.max(0.02, Math.min(0.98, (e.clientX - rect.left) / rect.width));
    const yPct = Math.max(0.02, Math.min(0.98, (e.clientY - rect.top) / rect.height));
    onAddFinding(xPct, yPct);
  }

  const baseLayout = imgH
    ? computeLayout(findings, displayWidth, imgH, pinOverrides, sideOverrides)
    : [];

  // Apply text-block Y overrides and recompute elbowY so the leader line
  // always bends toward the text block, even after manual repositioning
  const layout = baseLayout.map((a) => {
    const textY = textYOverrides[a.id] ?? a.textY;
    const elbowY = textY < a.pinY ? a.pinY - STEM : a.pinY + STEM;
    return { ...a, textY, elbowY };
  });

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
                onDelete={onFindingDelete}
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
                cursor: addMode ? "crosshair" : "default",
              }}
              viewBox={`0 0 ${displayWidth} ${imgH}`}
            >
              {/* Capture rect for add-pin clicks — sits below all pins */}
              {addMode && !readOnly && (
                <rect
                  x={0}
                  y={0}
                  width={displayWidth}
                  height={imgH}
                  fill="transparent"
                  style={{ pointerEvents: "all", cursor: "crosshair" }}
                  onClick={handleSvgClick}
                />
              )}

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
                    {/* Pin — draggable (disabled in add mode) */}
                    <circle
                      cx={a.pinX}
                      cy={a.pinY}
                      r={10}
                      fill="transparent"
                      style={{
                        cursor: readOnly || addMode ? "default" : "move",
                        pointerEvents: readOnly ? "none" : "all",
                      }}
                      onMouseDown={readOnly || addMode ? undefined : (e) => startPinDrag(a.id, e)}
                      onClick={addMode ? (e) => e.stopPropagation() : undefined}
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
                onDelete={onFindingDelete}
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
  onDelete,
  readOnly,
  onDragStart,
}: {
  annotation: AnnotationLayout;
  side: "left" | "right";
  onEdit?: (id: string, field: "humanNote" | "fix" | "issue" | "title", value: string) => void;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
  onDragStart: (e: React.MouseEvent) => void;
}) {
  const color = SEVERITY_COLOR[a.finding.severity] ?? "#ef4444";
  const TA: React.CSSProperties = {
    fontSize: 11,
    width: "100%",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid #333",
    resize: "vertical",
    outline: "none",
    padding: "2px 0",
    lineHeight: 1.4,
  };

  return (
    <div
      style={{
        position: "absolute",
        top: a.textY - 10,
        ...(side === "left" ? { right: 16, textAlign: "right" } : { left: 16, textAlign: "left" }),
        width: MARGIN_W - 28,
      }}
    >
      {readOnly ? (
        <>
          {/* Read-only: colored title label */}
          <div style={{ color, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
            {a.finding.title}
          </div>
          <p style={{ fontSize: 11, color: "#aaa", margin: "2px 0", lineHeight: 1.4 }}>{a.finding.issue}</p>
          <p style={{ fontSize: 11, color: "#666", margin: "2px 0", lineHeight: 1.4 }}>→ {a.finding.fix}</p>
          {a.finding.humanNote && (
            <p style={{ fontSize: 11, color: "#6AC89B", margin: "4px 0 0", lineHeight: 1.4 }}>{a.finding.humanNote}</p>
          )}
        </>
      ) : (
        <>
          {/* Edit mode: drag handle row + delete button */}
          <div
            onMouseDown={onDragStart}
            style={{
              display: "flex",
              justifyContent: side === "left" ? "flex-end" : "flex-start",
              alignItems: "center",
              gap: 4,
              marginBottom: 3,
              cursor: "ns-resize",
              userSelect: "none",
            }}
            title="Drag to reposition"
          >
            <span style={{ color, fontSize: 9, letterSpacing: "0.1em", opacity: 0.7 }}>⠿⠿</span>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onDelete?.(a.id); }}
              style={{ fontSize: 13, color: "#555", background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, marginLeft: "auto" }}
              title="Remove finding"
            >
              ×
            </button>
          </div>

          {/* Editable title */}
          <input
            value={a.finding.title}
            onChange={(e) => onEdit?.(a.id, "title", e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Finding title…"
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color,
              width: "100%",
              background: "transparent",
              border: "none",
              borderBottom: `1px solid ${color}40`,
              outline: "none",
              padding: "1px 0",
              marginBottom: 4,
              textAlign: side === "left" ? "right" : "left",
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <textarea
              value={a.finding.issue}
              onChange={(e) => onEdit?.(a.id, "issue", e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              rows={2}
              style={{ ...TA, color: "#aaa" }}
              placeholder="Issue…"
            />
            <textarea
              value={a.finding.fix}
              onChange={(e) => onEdit?.(a.id, "fix", e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              rows={2}
              style={{ ...TA, color: "#666" }}
              placeholder="Fix direction…"
            />
            <textarea
              value={a.finding.humanNote}
              onChange={(e) => onEdit?.(a.id, "humanNote", e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              rows={1}
              style={{ ...TA, color: "#6AC89B" }}
              placeholder="Add note…"
            />
          </div>
        </>
      )}
    </div>
  );
}
