/**
 * Evaluation learning system — PROTECTED IP.
 *
 * Captures human corrections to AI-generated annotations and builds
 * calibration data that feeds back into future analysis prompts.
 *
 * Three signal types:
 *   pin_moved       — human corrected where an annotation pin points
 *   insight_edited  — human rewrote the issue description or fix direction
 *
 * MUST stay server-side. Never import from client components.
 */
import { redis } from "./redis";

const EVENTS_KEY = "admin:learning:events";
const MAX_EVENTS = 2000;

export type PinMovedEvent = {
  type: "pin_moved";
  ts: number;
  evaluationId: string;
  screenId: string;
  findingId: string;
  title: string;
  category: string;
  severity: string;
  origX: number;
  origY: number;
  corrX: number;
  corrY: number;
};

export type InsightEditedEvent = {
  type: "insight_edited";
  ts: number;
  evaluationId: string;
  screenId: string;
  findingId: string;
  title: string;
  category: string;
  severity: string;
  field: "issue" | "fix";
  before: string;
  after: string;
};

export type LearningEvent = PinMovedEvent | InsightEditedEvent;

export type PinCalibration = {
  category: string;
  count: number;
  avgDeltaX: number;
  avgDeltaY: number;
};

export type ExemplaryFinding = {
  category: string;
  severity: string;
  title: string;
  issue: string;
  fix: string;
};

export type LearningContext = {
  pinCalibration: PinCalibration[];
  exemplaryFindings: ExemplaryFinding[];
  totalEvents: number;
};

export async function appendLearningEvent(event: LearningEvent): Promise<void> {
  await redis.lpush(EVENTS_KEY, JSON.stringify(event));
  await redis.ltrim(EVENTS_KEY, 0, MAX_EVENTS - 1);
}

export async function appendLearningEvents(events: LearningEvent[]): Promise<void> {
  if (!events.length) return;
  for (const event of events) {
    await redis.lpush(EVENTS_KEY, JSON.stringify(event));
  }
  await redis.ltrim(EVENTS_KEY, 0, MAX_EVENTS - 1);
}

export async function getLearningEvents(limit = 500): Promise<LearningEvent[]> {
  const raw = await redis.lrange<string>(EVENTS_KEY, 0, limit - 1);
  return raw
    .map((r) => {
      try {
        const parsed = typeof r === "string" ? JSON.parse(r) : r;
        return parsed as LearningEvent;
      } catch {
        return null;
      }
    })
    .filter((e): e is LearningEvent => e !== null);
}

export async function getLearningContext(): Promise<LearningContext> {
  const events = await getLearningEvents(500);

  // Pin calibration: average correction delta per category
  const pinByCategory: Record<string, { sumDX: number; sumDY: number; count: number }> = {};
  for (const ev of events) {
    if (ev.type !== "pin_moved") continue;
    const c = ev.category || "other";
    if (!pinByCategory[c]) pinByCategory[c] = { sumDX: 0, sumDY: 0, count: 0 };
    pinByCategory[c].sumDX += ev.corrX - ev.origX;
    pinByCategory[c].sumDY += ev.corrY - ev.origY;
    pinByCategory[c].count++;
  }
  const pinCalibration: PinCalibration[] = Object.entries(pinByCategory)
    .filter(([, v]) => v.count >= 3)
    .map(([category, v]) => ({
      category,
      count: v.count,
      avgDeltaX: Math.round((v.sumDX / v.count) * 1000) / 1000,
      avgDeltaY: Math.round((v.sumDY / v.count) * 1000) / 1000,
    }));

  // Exemplary findings: group insight edits by finding, keep pairs where both issue+fix were refined
  const findingMap: Record<
    string,
    { title: string; category: string; severity: string; issue?: string; fix?: string; ts: number }
  > = {};
  for (const ev of events) {
    if (ev.type !== "insight_edited") continue;
    if (ev.after.length < 20) continue;
    const key = `${ev.evaluationId}:${ev.findingId}`;
    if (!findingMap[key]) {
      findingMap[key] = {
        title: ev.title,
        category: ev.category,
        severity: ev.severity,
        ts: ev.ts,
      };
    }
    // Always take latest edit for each field
    if (ev.ts >= findingMap[key].ts) {
      findingMap[key].ts = ev.ts;
    }
    findingMap[key][ev.field] = ev.after;
  }

  // Prefer findings where both issue and fix were edited (highest quality signal)
  const full = Object.values(findingMap).filter((f) => f.issue && f.fix);
  const partial = Object.values(findingMap).filter((f) => f.issue || f.fix);
  const pool = [...full, ...partial].slice(0, 6);

  const exemplaryFindings: ExemplaryFinding[] = pool
    .filter((f) => (f.issue || f.fix))
    .map((f) => ({
      category: f.category,
      severity: f.severity,
      title: f.title,
      issue: f.issue ?? "",
      fix: f.fix ?? "",
    }));

  return {
    pinCalibration,
    exemplaryFindings,
    totalEvents: events.length,
  };
}
