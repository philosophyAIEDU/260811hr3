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

// 이 API는 항상 최신 데이터를 읽어야 하므로 Next.js가 응답을 저장해두지 않도록 합니다.
export const dynamic = "force-dynamic";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * 조회 대상 진단 회차(지정 없으면 최신)를 찾습니다.
 * 사번·이름을 쓰지 않고, 브라우저가 자동 발급한 무작위 식별자로 본인 데이터만 찾습니다.
 */
async function resolveAssessment(
  userId: string,
  assessmentId: number | null
): Promise<
  | { ok: true; employee: EmployeeRecord | null; assessment: AssessmentRecord }
  | { ok: false; error: string }
> {
  const employee = await findEmployee(userId);

  const assessment = assessmentId
    ? await getAssessmentById(assessmentId, userId)
    : await getLatestAssessment(userId);

  if (!assessment) {
    return { ok: false, error: "진단 이력이 없습니다. 역량 자가진단을 먼저 진행해 주세요." };
  }

  return { ok: true, employee, assessment };
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id")?.trim();
  const assessmentIdParam = req.nextUrl.searchParams.get("assessment_id");
  const assessmentId = assessmentIdParam ? Number(assessmentIdParam) : null;

  if (!userId) return fail("사용자 정보가 없습니다. 시작 화면부터 다시 진행해 주세요.");

  try {
    const resolved = await resolveAssessment(userId, assessmentId);
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

  const userId = String(body.user_id ?? "").trim();
  const assessmentId = body.assessment_id ? Number(body.assessment_id) : null;
  const personalApiKey = String(body.personal_api_key ?? "").trim();

  if (!userId) return fail("사용자 정보가 없습니다. 시작 화면부터 다시 진행해 주세요.");

  try {
    const resolved = await resolveAssessment(userId, assessmentId);
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
      current_job: resolved.employee?.current_job ?? "",
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
