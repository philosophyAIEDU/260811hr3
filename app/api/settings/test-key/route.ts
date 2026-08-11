/**
 * 화면7(설정)의 "연결 테스트" 버튼에서 사용하는 API입니다.
 * 입력한 Gemini API 키를 저장하지 않고, 실제로 동작하는지만 확인합니다.
 */
import { NextRequest, NextResponse } from "next/server";
import { testGeminiKey } from "@/lib/gemini/client";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const apiKey = String(body.api_key ?? "").trim();
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "API 키를 입력해 주세요." }, { status: 400 });
  }

  try {
    await testGeminiKey(apiKey);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/settings/test-key]", err);
    return NextResponse.json(
      { ok: false, error: "연결에 실패했습니다. 키가 올바른지 확인해 주세요." },
      { status: 400 }
    );
  }
}
