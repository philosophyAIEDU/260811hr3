/**
 * 사이트 전체 진입 코드를 확인하는 API입니다.
 * Netlify에 올리면 인터넷 누구나 주소를 알면 접속할 수 있게 되므로,
 * 최소한의 보호로 회사 공통 접속코드를 추가했습니다. (원 요청서에는 없던 항목)
 */
import { NextRequest, NextResponse } from "next/server";
import { SITE_ACCESS_CODE } from "@/lib/config/constants";

const COOKIE_NAME = "gp_site_access";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const code = String(body.code ?? "").trim();
  if (!code || code !== SITE_ACCESS_CODE) {
    return NextResponse.json({ ok: false, error: "접속코드가 올바르지 않습니다." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "granted", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30일 동안 유지
  });
  return res;
}
