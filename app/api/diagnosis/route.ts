/**
 * 화면2(역량 자가진단)에서 제출한 진단을 저장하고, 화면3(내 진단 결과)에서 조회하는 API입니다.
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
 * 사번+이름이 일치해야 조회되며, 그 직원의 모든 진단 이력과 역량점수를 최신순으로 돌려줍니다.
 */
export async function GET(req: NextRequest) {
  const employeeId = req.nextUrl.searchParams.get("employee_id")?.trim();
  const name = req.nextUrl.searchParams.get("name")?.trim();

  if (!employeeId || !name) {
    return fail("사번과 이름을 모두 입력해 주세요.");
  }

  try {
    const employee = await findEmployee(employeeId);
    if (!employee || employee.name !== name) {
      return fail("사번과 이름이 일치하지 않습니다. 다시 확인해 주세요.");
    }

    const assessments = await getAssessmentsForEmployee(employeeId);
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

  const employeeId = String(body.employee_id ?? "").trim();
  const desiredJob = String(body.desired_job ?? "").trim();
  const careerGoal = String(body.career_goal ?? "").trim();
  const scores = body.scores as Record<string, number> | undefined;

  if (!employeeId) return fail("사번 정보가 없습니다. 시작 화면부터 다시 진행해 주세요.");
  if (!JOB_LIST.includes(desiredJob)) return fail("희망직무를 선택해 주세요.");
  if (!careerGoal) return fail("커리어 목표를 입력해 주세요.");
  if (!scores || typeof scores !== "object") return fail("역량 점수를 입력해 주세요.");

  for (const name of COMPETENCY_NAMES) {
    const score = scores[name];
    if (
      typeof score !== "number" ||
      !Number.isInteger(score) ||
      score < SCORE_MIN ||
      score > SCORE_MAX
    ) {
      return fail(`"${name}" 역량 점수를 ${SCORE_MIN}~${SCORE_MAX} 사이로 선택해 주세요.`);
    }
  }

  try {
    const employee = await findEmployee(employeeId);
    if (!employee) {
      return fail("등록되지 않은 사번입니다. 시작 화면부터 다시 진행해 주세요.");
    }

    const assessmentId = await createAssessment({
      employee_id: employeeId,
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
