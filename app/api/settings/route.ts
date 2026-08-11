/**
 * 화면7(설정)의 "공용 API 키(관리자)" 영역에서 사용하는 API입니다.
 * GET: 공용 키가 설정되어 있는지 여부만 알려줍니다. (키 값 자체는 절대 내려주지 않음)
 * POST: 관리자 코드를 확인한 뒤 공용 키를 저장합니다.
 * DELETE: 관리자 코드를 확인한 뒤 공용 키를 삭제합니다.
 */
import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db/db";
import { ADMIN_CODE, SHARED_GEMINI_KEY_SETTING } from "@/lib/config/constants";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`SELECT value FROM app_settings WHERE key = ${SHARED_GEMINI_KEY_SETTING}`;
    const configured = rows.length > 0 && rows[0].value.trim().length > 0;
    return NextResponse.json({ configured });
  } catch (err) {
    console.error("[GET /api/settings]", err);
    return fail("설정 정보를 불러오는 중 문제가 발생했습니다.", 500);
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("요청 형식이 올바르지 않습니다.");
  }

  const adminCode = String(body.admin_code ?? "");
  const apiKey = String(body.api_key ?? "").trim();

  if (adminCode !== ADMIN_CODE) {
    return fail("관리자 코드가 올바르지 않습니다.", 401);
  }
  if (!apiKey) {
    return fail("API 키를 입력해 주세요.");
  }

  try {
    await ensureSchema();
    const sql = getSql();
    await sql`
      INSERT INTO app_settings (key, value)
      VALUES (${SHARED_GEMINI_KEY_SETTING}, ${apiKey})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/settings]", err);
    return fail("저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
}

export async function DELETE(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("요청 형식이 올바르지 않습니다.");
  }

  const adminCode = String(body.admin_code ?? "");
  if (adminCode !== ADMIN_CODE) {
    return fail("관리자 코드가 올바르지 않습니다.", 401);
  }

  try {
    await ensureSchema();
    const sql = getSql();
    await sql`DELETE FROM app_settings WHERE key = ${SHARED_GEMINI_KEY_SETTING}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/settings]", err);
    return fail("삭제 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
}
