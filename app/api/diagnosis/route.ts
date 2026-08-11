/**
 * 화면2(역량 자가진단)에서 제출한 진단을 저장하는 API입니다.
 * 진단 1회 제출 = assessments 1행 + competency_scores 10행(역량 개수만큼)
 */
import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db/db";
import { COMPETENCY_NAMES } from "@/lib/config/competencies";
import { JOB_LIST, JOB_REQUIREMENTS } from "@/lib/config/jobRequirements";
import { SCORE_MAX, SCORE_MIN } from "@/lib/config/constants";

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
    await ensureSchema();
    const sql = getSql();

    const employeeRows = await sql`SELECT employee_id FROM employees WHERE employee_id = ${employeeId}`;
    if (employeeRows.length === 0) {
      return fail("등록되지 않은 사번입니다. 시작 화면부터 다시 진행해 주세요.");
    }

    const assessedAt = nowKst();
    const inserted = await sql`
      INSERT INTO assessments (employee_id, assessed_at, desired_job, career_goal)
      VALUES (${employeeId}, ${assessedAt}, ${desiredJob}, ${careerGoal})
      RETURNING assessment_id
    `;
    const assessmentId = inserted[0].assessment_id as number;

    const requiredLevels = JOB_REQUIREMENTS[desiredJob];
    await Promise.all(
      COMPETENCY_NAMES.map((name) =>
        sql`
          INSERT INTO competency_scores (assessment_id, competency_name, current_score, required_level)
          VALUES (${assessmentId}, ${name}, ${scores[name]}, ${requiredLevels[name]})
        `
      )
    );

    return NextResponse.json({ ok: true, assessment_id: assessmentId });
  } catch (err) {
    console.error("[POST /api/diagnosis]", err);
    return fail("진단 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
}
