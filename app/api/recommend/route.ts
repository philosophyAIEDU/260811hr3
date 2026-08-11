/**
 * 화면4(AI 맞춤 추천)에서 사용하는 API입니다.
 * GET  : 이미 만들어둔 추천이 있으면 그대로 돌려줍니다. (매번 새로 AI를 호출하지 않도록)
 * POST : Gemini를 호출해 새 추천을 만들고, 해당 진단 회차의 기존 추천을 새 결과로 교체합니다.
 */
import { NextRequest, NextResponse } from "next/server";
import { COMPETENCY_NAMES } from "@/lib/config/competencies";
import { SHARED_GEMINI_KEY_SETTING } from "@/lib/config/constants";
import { generateWithGemini } from "@/lib/gemini/client";
import { buildRecommendPrompt, parseRecommendResponse } from "@/lib/gemini/recommendPrompt";
import {
  type AssessmentRecord,
  type EmployeeRecord,
  findEmployee,
  getAssessmentById,
  getLatestAssessment,
  getRecommendationsForAssessment,
  getScoresForAssessment,
  getSetting,
  replaceRecommendations,
} from "@/lib/db/store";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** 사번+이름을 확인하고, 조회 대상 진단 회차(지정 없으면 최신)를 찾습니다. */
async function resolveAssessment(
  employeeId: string,
  name: string,
  assessmentId: number | null
): Promise<
  | { ok: true; employee: EmployeeRecord; assessment: AssessmentRecord }
  | { ok: false; error: string }
> {
  const employee = await findEmployee(employeeId);
  if (!employee || employee.name !== name) {
    return { ok: false, error: "사번과 이름이 일치하지 않습니다. 다시 확인해 주세요." };
  }

  const assessment = assessmentId
    ? await getAssessmentById(assessmentId, employeeId)
    : await getLatestAssessment(employeeId);

  if (!assessment) {
    return { ok: false, error: "진단 이력이 없습니다. 역량 자가진단을 먼저 진행해 주세요." };
  }

  return { ok: true, employee, assessment };
}

export async function GET(req: NextRequest) {
  const employeeId = req.nextUrl.searchParams.get("employee_id")?.trim();
  const name = req.nextUrl.searchParams.get("name")?.trim();
  const assessmentIdParam = req.nextUrl.searchParams.get("assessment_id");
  const assessmentId = assessmentIdParam ? Number(assessmentIdParam) : null;

  if (!employeeId || !name) return fail("사번과 이름을 모두 입력해 주세요.");

  try {
    const resolved = await resolveAssessment(employeeId, name, assessmentId);
    if (!resolved.ok) return fail(resolved.error);

    const recommendations = await getRecommendationsForAssessment(resolved.assessment.assessment_id);

    return NextResponse.json({
      assessment_id: resolved.assessment.assessment_id,
      desired_job: resolved.assessment.desired_job,
      exists: recommendations.length > 0,
      recommendations,
    });
  } catch (err) {
    console.error("[GET /api/recommend]", err);
    return fail("데이터를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("요청 형식이 올바르지 않습니다.");
  }

  const employeeId = String(body.employee_id ?? "").trim();
  const name = String(body.name ?? "").trim();
  const assessmentId = body.assessment_id ? Number(body.assessment_id) : null;
  const personalApiKey = String(body.personal_api_key ?? "").trim();

  if (!employeeId || !name) return fail("사번과 이름을 모두 입력해 주세요.");

  try {
    const resolved = await resolveAssessment(employeeId, name, assessmentId);
    if (!resolved.ok) return fail(resolved.error);

    let apiKey = personalApiKey;
    if (!apiKey) {
      apiKey = (await getSetting(SHARED_GEMINI_KEY_SETTING)) ?? "";
    }
    if (!apiKey) {
      return fail("AI 추천을 사용하려면 설정 화면에서 Gemini API 키를 먼저 등록해 주세요.");
    }

    const scoreRows = await getScoresForAssessment(resolved.assessment.assessment_id);
    const gaps = COMPETENCY_NAMES.map((competencyName) => {
      const row = scoreRows.find((r) => r.competency_name === competencyName);
      return {
        name: competencyName,
        current_score: row?.current_score ?? 0,
        required_level: row?.required_level ?? 0,
      };
    });

    const prompt = buildRecommendPrompt({
      desired_job: resolved.assessment.desired_job,
      current_job: resolved.employee.current_job,
      career_goal: resolved.assessment.career_goal,
      gaps,
    });

    let items;
    try {
      const raw = await generateWithGemini(apiKey, prompt, { asJson: true });
      items = parseRecommendResponse(raw);
    } catch (err) {
      console.error("[POST /api/recommend] gemini", err);
      return fail("AI 추천을 만드는 중 문제가 발생했습니다. API 키 상태를 확인하거나 잠시 후 다시 시도해 주세요.", 502);
    }

    const recommendations = await replaceRecommendations(resolved.assessment.assessment_id, items);

    return NextResponse.json({
      ok: true,
      assessment_id: resolved.assessment.assessment_id,
      recommendations,
    });
  } catch (err) {
    console.error("[POST /api/recommend]", err);
    return fail("추천 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
}
