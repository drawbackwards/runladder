"use client";

import { useEffect, useState } from "react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Evaluation } from "@/lib/evaluation";
import { AnnotatedScreen } from "@/components/admin/AnnotatedScreen";

const SCORE_LABEL: Record<string, string> = {
  Functional: "Functional",
  Usable: "Usable",
  Comfortable: "Comfortable",
  Delightful: "Delightful",
  Meaningful: "Meaningful",
};

const SCORE_COLOR = (s: number) => {
  if (s >= 4) return "#22c55e";
  if (s >= 3) return "#eab308";
  if (s >= 2) return "#f97316";
  return "#ef4444";
};

export default function ReportPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const params = useParams<{ id: string }>();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch(`/api/admin/evaluations/${params.id}`)
      .then((r) => r.json())
      .then(({ evaluation: ev, error: err }) => {
        if (err) throw new Error(err);
        setEvaluation(ev);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isSignedIn, params.id]);

  useEffect(() => {
    if (!evaluation) return;
    document.title = `${evaluation.clientName} — ${evaluation.projectName} | Ladder Evaluation`;
    return () => { document.title = "Ladder"; };
  }, [evaluation]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  if (loading) {
    return <div className="p-10 text-muted font-sans">Loading…</div>;
  }

  if (!evaluation) {
    return <div className="p-10 text-red-400 font-sans">{error ?? "Not found."}</div>;
  }

  const analyzedScreens = evaluation.screens.filter((s) => s.analyzedAt);

  return (
    <>
      {/* Screen-only toolbar — hidden in print */}
      <div className="print:hidden pt-20 pb-4 px-8 flex items-center justify-between border-b border-[#2a2a2a] bg-background sticky top-0 z-10">
        <div className="text-[10px] uppercase tracking-widest text-muted font-mono">
          <Link href={`/admin/evaluations/${evaluation.id}`} className="hover:text-foreground transition-colors">
            ← Back to review
          </Link>
        </div>
        <button
          onClick={() => window.print()}
          className="text-xs font-semibold bg-ladder-green text-background px-5 py-1.5 rounded-sm hover:bg-ladder-green/90 transition-colors font-sans"
        >
          Print / Export PDF
        </button>
      </div>

      {/* Report body */}
      <div className="report-body bg-white text-[#111] font-sans" style={{ minHeight: "100vh" }}>
        {/* Cover / header */}
        <div
          className="report-header"
          style={{
            background: "#0e0e0e",
            color: "#fff",
            padding: "48px 56px 40px",
            pageBreakAfter: "avoid",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            {/* Left: branding */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6AC89B", marginBottom: 16, fontFamily: "monospace" }}>
                Ladder Evaluation
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1, marginBottom: 6 }}>
                {evaluation.clientName}
              </div>
              <div style={{ fontSize: 16, color: "#888", fontWeight: 400 }}>
                {evaluation.projectName}
              </div>
            </div>

            {/* Right: score */}
            {evaluation.overallScore !== null && (
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 56,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: SCORE_COLOR(evaluation.overallScore),
                    fontFamily: "monospace",
                  }}
                >
                  {evaluation.overallScore.toFixed(1)}
                </div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {analyzedScreens[0]?.label ?? ""}
                </div>
              </div>
            )}
          </div>

          {/* Ladder level bar */}
          <div style={{ display: "flex", gap: 4, marginTop: 32 }}>
            {(["Functional", "Usable", "Comfortable", "Delightful", "Meaningful"] as const).map((level, i) => {
              const score = evaluation.overallScore ?? 0;
              const levelMin = i + 1;
              const active = score >= levelMin && score < levelMin + 1;
              const passed = score >= levelMin + 1;
              return (
                <div
                  key={level}
                  style={{
                    flex: 1,
                    height: 4,
                    background: passed ? "#6AC89B" : active ? SCORE_COLOR(score) : "#333",
                    borderRadius: 2,
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            {["Functional", "Usable", "Comfortable", "Delightful", "Meaningful"].map((level) => (
              <div key={level} style={{ flex: 1, fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {level}
              </div>
            ))}
          </div>

          {/* Summary */}
          {evaluation.executiveSummary && (
            <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid #222" }}>
              <p style={{ fontSize: 14, color: "#ccc", lineHeight: 1.6, maxWidth: 680 }}>
                {evaluation.executiveSummary}
              </p>
            </div>
          )}

          {/* Drawbackwards credit */}
          <div style={{ marginTop: 24, fontSize: 10, color: "#444", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {evaluation.auditorName
              ? `Prepared by ${evaluation.auditorName} · Drawbackwards · runladder.com`
              : "Prepared by Drawbackwards · runladder.com"}
          </div>
        </div>

        {/* Screens */}
        {analyzedScreens.map((screen, screenIdx) => (
          <div
            key={screen.id}
            style={{
              padding: "48px 0",
              pageBreakBefore: screenIdx > 0 ? "always" : "auto",
              pageBreakInside: "avoid",
            }}
          >
            {/* Screen label */}
            <div style={{ padding: "0 56px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 600, color: "#111" }}>
                  {screen.screenName || `Screen ${screenIdx + 1}`}
                </span>
                {screen.score !== null && (
                  <>
                    <span
                      style={{
                        fontSize: 24,
                        fontWeight: 700,
                        fontFamily: "monospace",
                        color: SCORE_COLOR(screen.score),
                      }}
                    >
                      {screen.score.toFixed(1)}
                    </span>
                    <span style={{ fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      {SCORE_LABEL[screen.label ?? ""] ?? screen.label}
                    </span>
                  </>
                )}
              </div>
              {screen.summary && (
                <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>{screen.summary}</p>
              )}
            </div>

            {/* Annotated screen — sized to fit letter page (816px = 168 + 480 + 168) */}
            <div>
              <AnnotatedScreen
                imageDataUrl={screen.imageData}
                findings={screen.findings}
                displayWidth={480}
                marginWidth={168}
                readOnly
              />
            </div>

            {/* Findings detail list */}
            {screen.findings.length > 0 && (
              <div style={{ padding: "32px 56px 0" }}>
                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 24 }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginBottom: 16 }}>
                    Findings
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {screen.findings.map((f, i) => (
                      <div key={f.id} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            background:
                              f.severity === "high" ? "#ef4444" : f.severity === "medium" ? "#f97316" : "#eab308",
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        >
                          {i + 1}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 3 }}>
                            {f.title}
                          </div>
                          <p style={{ fontSize: 12, color: "#555", lineHeight: 1.6, margin: "0 0 4px" }}>
                            {f.issue}
                          </p>
                          <p style={{ fontSize: 12, color: "#6AC89B", lineHeight: 1.5, margin: 0 }}>
                            → {f.fix}
                          </p>
                          {f.humanNote && (
                            <p style={{ fontSize: 12, color: "#888", lineHeight: 1.5, marginTop: 4, fontStyle: "italic" }}>
                              {f.humanNote}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* What's next */}
        {evaluation.nextSteps && (
          <div
            style={{
              background: "#0e0e0e",
              color: "#fff",
              padding: "40px 56px",
              pageBreakBefore: "always",
            }}
          >
            <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6AC89B", marginBottom: 16, fontFamily: "monospace" }}>
              What&apos;s next
            </div>
            <p style={{ fontSize: 15, color: "#ccc", lineHeight: 1.7, maxWidth: 640 }}>
              {evaluation.nextSteps}
            </p>
            <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #222", fontSize: 11, color: "#444" }}>
              Drawbackwards · drawbackwards.com · runladder.com
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white; margin: 0; padding: 0; }
          .report-body { margin: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page {
            margin: 0;
            size: letter portrait;
          }
        }
      `}</style>
    </>
  );
}
