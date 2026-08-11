/**
 * 그로우패스의 데이터 저장소입니다.
 * Netlify DB(Postgres)를 따로 연결해야 하는 번거로움을 없애기 위해,
 * Netlify에 기본 내장된 **Netlify Blobs**(별도 연결/설정 없이 배포하면 바로 쓸 수 있음)에
 * 데이터 전체를 JSON 문서 하나로 저장하는 방식으로 바꿨습니다. (MVP 단계 — 아래 "한계" 참고)
 *
 * 모든 API 코드는 이 파일의 함수를 통해서만 데이터를 읽고 씁니다.
 *
 * [한계] 이 방식은 요청마다 전체 JSON을 읽고 고쳐서 다시 쓰는 구조라, 아주 짧은 시간에
 * 여러 명이 동시에 쓰기 작업을 하면 마지막에 저장한 내용이 이전 내용을 덮어쓸 수 있습니다.
 * 사내 소규모 인원이 쓰는 MVP 단계에서는 문제되지 않을 확률이 높지만, 사용자가 많아지면
 * 정식 데이터베이스(Netlify DB 등)로 옮기는 것을 권장합니다.
 */
import { getStore } from "@netlify/blobs";

const STORE_NAME = "growthpath";
const BLOB_KEY = "data";

export interface EmployeeRecord {
  employee_id: string;
  name: string;
  department: string;
  current_job: string;
  position: string;
  created_at: string;
}

export interface AssessmentRecord {
  assessment_id: number;
  employee_id: string;
  assessed_at: string;
  desired_job: string;
  career_goal: string;
}

export interface ScoreRecord {
  assessment_id: number;
  competency_name: string;
  current_score: number;
  required_level: number;
}

export interface RecommendationRecord {
  recommendation_id: number;
  assessment_id: number;
  category: string;
  title: string;
  search_keyword: string;
  platform: string;
  reason: string;
  stage: string;
  status: string;
  completed_at: string | null;
}

interface StoreShape {
  employees: EmployeeRecord[];
  assessments: AssessmentRecord[];
  scores: ScoreRecord[];
  recommendations: RecommendationRecord[];
  settings: Record<string, string>;
  nextAssessmentId: number;
  nextRecommendationId: number;
}

function emptyData(): StoreShape {
  return {
    employees: [],
    assessments: [],
    scores: [],
    recommendations: [],
    settings: {},
    nextAssessmentId: 1,
    nextRecommendationId: 1,
  };
}

function blobStore() {
  return getStore(STORE_NAME);
}

async function readData(): Promise<StoreShape> {
  const data = await blobStore().get(BLOB_KEY, { type: "json" });
  return (data as StoreShape | null) ?? emptyData();
}

async function writeData(data: StoreShape): Promise<void> {
  await blobStore().setJSON(BLOB_KEY, data);
}

// ── 직원 ──────────────────────────────────────────────

export async function findEmployee(employeeId: string): Promise<EmployeeRecord | null> {
  const data = await readData();
  return data.employees.find((e) => e.employee_id === employeeId) ?? null;
}

export async function createEmployee(input: EmployeeRecord): Promise<void> {
  const data = await readData();
  data.employees.push(input);
  await writeData(data);
}

// ── 진단회차 · 역량점수 ──────────────────────────────────

export async function createAssessment(input: {
  employee_id: string;
  assessed_at: string;
  desired_job: string;
  career_goal: string;
  scores: Record<string, number>;
  requiredLevels: Record<string, number>;
}): Promise<number> {
  const data = await readData();
  const assessmentId = data.nextAssessmentId;
  data.nextAssessmentId += 1;

  data.assessments.push({
    assessment_id: assessmentId,
    employee_id: input.employee_id,
    assessed_at: input.assessed_at,
    desired_job: input.desired_job,
    career_goal: input.career_goal,
  });

  for (const name of Object.keys(input.scores)) {
    data.scores.push({
      assessment_id: assessmentId,
      competency_name: name,
      current_score: input.scores[name],
      required_level: input.requiredLevels[name] ?? 0,
    });
  }

  await writeData(data);
  return assessmentId;
}

export async function getAssessmentsForEmployee(employeeId: string): Promise<AssessmentRecord[]> {
  const data = await readData();
  return data.assessments
    .filter((a) => a.employee_id === employeeId)
    .sort((a, b) => b.assessment_id - a.assessment_id);
}

export async function getLatestAssessment(employeeId: string): Promise<AssessmentRecord | null> {
  const list = await getAssessmentsForEmployee(employeeId);
  return list[0] ?? null;
}

export async function getAssessmentById(
  assessmentId: number,
  employeeId?: string
): Promise<AssessmentRecord | null> {
  const data = await readData();
  return (
    data.assessments.find(
      (a) => a.assessment_id === assessmentId && (!employeeId || a.employee_id === employeeId)
    ) ?? null
  );
}

export async function getScoresForAssessment(assessmentId: number): Promise<ScoreRecord[]> {
  const data = await readData();
  return data.scores.filter((s) => s.assessment_id === assessmentId);
}

// ── 추천결과 ──────────────────────────────────────────

export async function getRecommendationsForAssessment(
  assessmentId: number
): Promise<RecommendationRecord[]> {
  const data = await readData();
  return data.recommendations.filter((r) => r.assessment_id === assessmentId);
}

/** 이 진단 회차의 기존 추천을 지우고, 새 추천 목록으로 통째로 교체합니다. */
export async function replaceRecommendations(
  assessmentId: number,
  items: Array<
    Pick<RecommendationRecord, "category" | "title" | "search_keyword" | "platform" | "reason" | "stage"> &
      Partial<Pick<RecommendationRecord, "status" | "completed_at">>
  >
): Promise<RecommendationRecord[]> {
  const data = await readData();
  data.recommendations = data.recommendations.filter((r) => r.assessment_id !== assessmentId);

  const created: RecommendationRecord[] = [];
  for (const item of items) {
    const recommendationId = data.nextRecommendationId;
    data.nextRecommendationId += 1;
    const record: RecommendationRecord = {
      recommendation_id: recommendationId,
      assessment_id: assessmentId,
      category: item.category,
      title: item.title,
      search_keyword: item.search_keyword,
      platform: item.platform,
      reason: item.reason,
      stage: item.stage,
      status: item.status ?? "예정",
      completed_at: item.completed_at ?? null,
    };
    data.recommendations.push(record);
    created.push(record);
  }

  await writeData(data);
  return created;
}

/** 상태를 바꿉니다. recommendation_id가 그 employeeId 소유가 맞는지 함께 확인합니다. */
export async function updateRecommendationStatus(
  recommendationId: number,
  employeeId: string,
  status: string,
  completedAt: string | null
): Promise<RecommendationRecord | null> {
  const data = await readData();
  const rec = data.recommendations.find((r) => r.recommendation_id === recommendationId);
  if (!rec) return null;

  const assessment = data.assessments.find((a) => a.assessment_id === rec.assessment_id);
  if (!assessment || assessment.employee_id !== employeeId) return null;

  rec.status = status;
  rec.completed_at = completedAt;
  await writeData(data);
  return rec;
}

// ── 설정(공용 Gemini API 키) ─────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const data = await readData();
  return data.settings[key] ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const data = await readData();
  data.settings[key] = value;
  await writeData(data);
}

export async function deleteSetting(key: string): Promise<void> {
  const data = await readData();
  delete data.settings[key];
  await writeData(data);
}

// ── 관리자 통계 · 엑셀 내보내기에서 직접 쓰는 원본 조회 ───────────

export async function getAllData(): Promise<StoreShape> {
  return readData();
}
