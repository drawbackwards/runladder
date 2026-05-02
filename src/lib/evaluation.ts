import { redis } from "./redis";

export type EvaluationMode = "sample" | "audit";
export type EvaluationStatus = "draft" | "analyzing" | "review" | "approved";

export type AnnotationFinding = {
  id: string;
  title: string;
  issue: string;
  fix: string;
  severity: "high" | "medium" | "low";
  xPercent: number;
  yPercent: number;
  category: string;
  humanNote: string;
};

export type EvaluationScreen = {
  id: string;
  imageData: string;
  screenName: string;
  score: number | null;
  label: string | null;
  summary: string | null;
  findings: AnnotationFinding[];
  analyzedAt: string | null;
};

export type Evaluation = {
  id: string;
  clientName: string;
  projectName: string;
  mode: EvaluationMode;
  status: EvaluationStatus;
  screens: EvaluationScreen[];
  overallScore: number | null;
  auditorName: string;
  executiveSummary: string;
  nextSteps: string;
  humanNotes: string;
  createdAt: string;
  updatedAt: string;
};

const evalKey = (id: string) => `admin:evaluation:${id}`;
const EVAL_INDEX = "admin:evaluations";

export async function listEvaluations(): Promise<Evaluation[]> {
  const ids = await redis.lrange(EVAL_INDEX, 0, -1);
  if (!ids.length) return [];
  const items = await Promise.all(ids.map((id) => redis.get<Evaluation>(evalKey(id))));
  return items
    .filter((e): e is Evaluation => e !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getEvaluation(id: string): Promise<Evaluation | null> {
  return redis.get<Evaluation>(evalKey(id));
}

export async function createEvaluation(data: {
  clientName: string;
  projectName: string;
  mode: EvaluationMode;
  auditorName?: string;
  screens: Array<{ imageData: string }>;
}): Promise<Evaluation> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const evaluation: Evaluation = {
    id,
    clientName: data.clientName,
    projectName: data.projectName,
    mode: data.mode,
    status: "draft",
    screens: data.screens.map((s, i) => ({
      id: `screen-${i}`,
      imageData: s.imageData,
      screenName: "",
      score: null,
      label: null,
      summary: null,
      findings: [],
      analyzedAt: null,
    })),
    overallScore: null,
    auditorName: data.auditorName ?? "",
    executiveSummary: "",
    nextSteps: "",
    humanNotes: "",
    createdAt: now,
    updatedAt: now,
  };
  await redis.set(evalKey(id), evaluation);
  await redis.lpush(EVAL_INDEX, id);
  return evaluation;
}

export async function updateEvaluation(
  id: string,
  patch: Partial<Omit<Evaluation, "id" | "createdAt">>,
): Promise<Evaluation | null> {
  const existing = await getEvaluation(id);
  if (!existing) return null;
  const updated: Evaluation = {
    ...existing,
    ...patch,
    id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  await redis.set(evalKey(id), updated);
  return updated;
}

export async function deleteEvaluation(id: string): Promise<void> {
  await redis.del(evalKey(id));
  await redis.lrem(EVAL_INDEX, 0, id);
}
