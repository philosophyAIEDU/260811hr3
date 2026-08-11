/**
 * 화면5(내 학습 현황)에서 학습 상태(예정/수강중/완료)를 바꿀 때 사용하는 API입니다.
 * 완료로 바꾸면 완료일을 자동으로 기록하고, 완료에서 다른 상태로 되돌리면 완료일을 지웁니다.
 */
import { NextRequest, NextResponse } from "next/server";
import { LEARNING_STATUSES } from "@/lib/config/constants";
import { findEmployee, updateRecommendationStatus } from "@/lib/db/store";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function todayKst(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("요청 형식이 올바르지 않습니다.");
  }

  const employeeId = String(body.employee_id ?? "").trim();
  const name = String(body.name ?? "").trim();
  const recommendationId = Number(body.recommendation_id);
  const status = String(body.status ?? "");

  if (!employeeId || !name) return fail("사번과 이름을 모두 입력해 주세요.");
  if (!recommendationId) return fail("변경할 항목 정보가 없습니다.");
  if (!LEARNING_STATUSES.includes(status as (typeof LEARNING_STATUSES)[number])) {
    return fail("상태 값이 올바르지 않습니다.");
  }

  try {
    const employee = await findEmployee(employeeId);
    if (!employee || employee.name !== name) {
      return fail("사번과 이름이 일치하지 않습니다. 다시 확인해 주세요.");
    }

    const completedAt = status === "완료" ? todayKst() : null;
    const updated = await updateRecommendationStatus(recommendationId, employeeId, status, completedAt);
    if (!updated) {
      return fail("해당 학습 항목을 찾을 수 없습니다.", 404);
    }

    return NextResponse.json({ ok: true, recommendation: updated });
  } catch (err) {
    console.error("[PATCH /api/learning-status]", err);
    return fail("상태 변경 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
}
