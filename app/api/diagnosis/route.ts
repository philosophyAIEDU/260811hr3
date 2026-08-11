/**
 * 화면2(역량 자가진단)에서 제출한 진단을 저장하고, 화면3(내 진단 결과)에서 조회하는 API입니다.
 *
 * 사번·이름을 입력받지 않습니다. 브라우저가 자동으로 만든 무작위 식별자(user_id)로
 * 본인 데이터를 구분하며, 처음 진단을 제출하는 사람은 이때 자동으로 등록됩니다.
 */
import { NextRequest, NextResponse } from "next/server";
import { COMPETENCY_NAMES } from "@/lib/config/competencies";
import { JOB_LIST, JOB_REQUIREMENTS } from "@/lib/config/jobRequirements";
import { SCORE_MAX, SCORE_MIN } from "@/lib/config/constants";
import {
  createAssessment,
  findEmployee,
  getAssessmentsForEmployee,
  getScoresForAssessment,
  upsertEmployee,
} from "@/lib/db/store";

// 이 API는 항상 최신 데이터를 읽어야 하므로 Next.js가 응답을 저장해두지 않도록 합니다.
export const dynamic = "force-dynamic";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** "YYYY-MM-DD HH:MM" 형식의 한국 시각 문자열을 만듭니다. */
function nowKst(): string {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

/**
 * 화면3(내 진단 결과)에서 사용하는 조회 API입니다.
 * 무작위 식별자가 곧 본인 확인 수단이므로, 그 식별자에 해당하는 데이터만 돌려줍니다.
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id")?.trim();

  if (!userId) {
    return fail("사용자 정보가 없습니다. 시작 화면부터 다시 진행해 주세요.");
  }

  try {
    const employee = await findEmployee(userId);
    const assessments = await getAssessmentsForEmployee(userId);
    const withScores = await Promise.all(
      assessments.map(async (a) => ({
        assessment_id: a.assessment_id,
        assessed_at: a.assessed_at,
        desired_job: a.desired_job,
        career_goal: a.career_goal,
        scores: await getScoresForAssessment(a.assessment_id),
      }))
    );

    return NextResponse.json({ employee, assessments: withScores });
  } catch (err) {
    console.error("[GET /api/diagnosis]", err);
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
  const desiredJob = String(body.desired_job ?? "").trim();
  const careerGoal = String(body.career_goal ?? "").trim();
  const scores = body.scores as Record<string, number> | undefined;

  // 아래 셋은 모두 선택 입력입니다. 비워두어도 진단이 정상 저장됩니다.
  const name = String(body.name ?? "").trim();
  const department = String(body.department ?? "").trim();
  const currentJob = String(body.current_job ?? "").trim();

  if (!userId) return fail("사용자 정보가 없습니다. 시작 화면부터 다시 진행해 주세요.");
  if (!JOB_LIST.includes(desiredJob)) return fail("희망직무를 선택해 주세요.");
  if (!careerGoal) return fail("커리어 목표를 입력해 주세요.");
  if (!scores || typeof scores !== "object") return fail("역량 점수를 입력해 주세요.");

  for (const competencyName of COMPETENCY_NAMES) {
    const score = scores[competencyName];
    if (
      typeof score !== "number" ||
      !Number.isInteger(score) ||
      score < SCORE_MIN ||
      score > SCORE_MAX
    ) {
      return fail(`"${competencyName}" 역량 점수를 ${SCORE_MIN}~${SCORE_MAX} 사이로 선택해 주세요.`);
    }
  }

  try {
    // 처음 진단하는 사람이면 여기서 자동으로 등록되고, 이미 있으면 입력한 항목만 갱신됩니다.
    await upsertEmployee({
      employee_id: userId,
      name,
      department,
      current_job: currentJob,
    });

    const assessmentId = await createAssessment({
      employee_id: userId,
      assessed_at: nowKst(),
      desired_job: desiredJob,
      career_goal: careerGoal,
      scores,
      requiredLevels: JOB_REQUIREMENTS[desiredJob],
    });

    return NextResponse.json({ ok: true, assessment_id: assessmentId });
  } catch (err) {
    console.error("[POST /api/diagnosis]", err);
    return fail("진단 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
}
