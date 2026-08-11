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
import fs from "node:fs/promises";
import path from "node:path";

const STORE_NAME = "growthpath";
const BLOB_KEY = "data";

/** 로컬(내 컴퓨터)에서 실행할 때 데이터를 담아두는 파일 위치입니다. git에는 올라가지 않습니다. */
const LOCAL_FILE = path.join(process.cwd(), ".data", "growthpath.json");

type Backend =
  | { kind: "blobs"; store: ReturnType<typeof getStore> }
  | { kind: "file" };

let backend: Backend | null = null;

/**
 * 어디에 저장할지 정합니다. (앱이 뜬 뒤 처음 한 번만 판단하고 그 뒤로는 재사용)
 *
 * - **Netlify에 배포된 상태** → Netlify Blobs에 저장합니다.
 *   (사이트에 아무 연결 설정을 하지 않아도, 배포만 하면 바로 동작합니다)
 * - **내 컴퓨터에서 npm run dev** → `.data/growthpath.json` 파일에 저장합니다.
 *   (Netlify 없이도 전체 기능을 테스트할 수 있게 하기 위함입니다. 이 파일은 git에 올라가지 않습니다)
 *
 * 판단 기준으로 환경변수를 짐작하지 않고, 실제로 Blobs를 쓸 수 있는지 직접 시도해 봅니다.
 * Blobs를 쓸 수 없는 환경에서 getStore()는 그 자리에서 오류를 내기 때문에,
 * "오류가 났다 = Netlify 밖이다"로 확실하게 구분할 수 있습니다.
 * 이렇게 하면 Netlify 위에서 실수로 파일에 저장해(=배포 때마다 데이터가 날아가) 버리는 일이 없습니다.
 */
function resolveBackend(): Backend {
  if (backend) return backend;

  try {
    const store = getStore({ name: STORE_NAME });
    backend = { kind: "blobs", store };
  } catch {
    backend = { kind: "file" };
  }

  return backend;
}

/** 강한 일관성 읽기를 쓸 수 없는 환경으로 확인되면 true가 되어, 이후로는 시도하지 않습니다. */
let strongReadUnavailable = false;

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

export interface StoreShape {
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

async function readData(): Promise<StoreShape> {
  const target = resolveBackend();

  if (target.kind === "blobs") {
    /**
     * 되도록 "강한 일관성(strong)"으로 읽습니다.
     * 이렇게 읽지 않으면 방금 저장한 내용이 잠시 동안 안 보일 수 있어서,
     * 진단을 제출하고 결과 화면으로 넘어갔을 때 방금 낸 결과가 비어 보일 수 있습니다.
     *
     * 다만 일부 실행 환경에서는 강한 일관성 읽기를 아예 지원하지 않고 오류를 냅니다.
     * 그 경우에는 앱 전체가 멈추는 대신, 일반 읽기로 한 단계 낮춰서 계속 동작하게 합니다.
     * (아주 잠깐 최신 내용이 늦게 보일 수는 있지만, 화면이 오류로 죽지는 않습니다)
     */
    if (!strongReadUnavailable) {
      try {
        const data = await target.store.get(BLOB_KEY, { type: "json", consistency: "strong" });
        return (data as StoreShape | null) ?? emptyData();
      } catch (err) {
        strongReadUnavailable = true;
        console.warn(
          "[store] 강한 일관성 읽기를 쓸 수 없어 일반 읽기로 전환합니다.",
          err instanceof Error ? err.message : err
        );
      }
    }

    const data = await target.store.get(BLOB_KEY, { type: "json" });
    return (data as StoreShape | null) ?? emptyData();
  }

  try {
    const text = await fs.readFile(LOCAL_FILE, "utf-8");
    return JSON.parse(text) as StoreShape;
  } catch {
    // 파일이 아직 없으면(=처음 실행) 빈 데이터로 시작합니다.
    return emptyData();
  }
}

async function writeData(data: StoreShape): Promise<void> {
  const target = resolveBackend();

  if (target.kind === "blobs") {
    await target.store.setJSON(BLOB_KEY, data);
    return;
  }

  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(data, null, 2), "utf-8");
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
