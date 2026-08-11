/**
 * 화면5(내 학습 현황)에서 학습 상태(예정/수강중/완료)를 바꿀 때 사용하는 API입니다.
 * 완료로 바꾸면 완료일을 자동으로 기록하고, 완료에서 다른 상태로 되돌리면 완료일을 지웁니다.
 *
 * 사번·이름을 쓰지 않고, 브라우저가 자동 발급한 무작위 식별자로 본인 항목인지 확인합니다.
 * (남의 항목은 식별자가 다르므로 변경되지 않습니다)
 */
import { NextRequest, NextResponse } from "next/server";
import { LEARNING_STATUSES } from "@/lib/config/constants";
import { updateRecommendationStatus } from "@/lib/db/store";

// 이 API는 항상 최신 데이터를 읽어야 하므로 Next.js가 응답을 저장해두지 않도록 합니다.
export const dynamic = "force-dynamic";

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

  const userId = String(body.user_id ?? "").trim();
  const recommendationId = Number(body.recommendation_id);
  const status = String(body.status ?? "");

  if (!userId) return fail("사용자 정보가 없습니다. 시작 화면부터 다시 진행해 주세요.");
  if (!recommendationId) return fail("변경할 항목 정보가 없습니다.");
  if (!LEARNING_STATUSES.includes(status as (typeof LEARNING_STATUSES)[number])) {
    return fail("상태 값이 올바르지 않습니다.");
  }

  try {
    const completedAt = status === "완료" ? todayKst() : null;
    const updated = await updateRecommendationStatus(recommendationId, userId, status, completedAt);
    if (!updated) {
      return fail("해당 학습 항목을 찾을 수 없습니다.", 404);
    }

    return NextResponse.json({ ok: true, recommendation: updated });
  } catch (err) {
    console.error("[PATCH /api/learning-status]", err);
    return fail("상태 변경 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
}
