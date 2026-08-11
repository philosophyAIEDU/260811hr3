/**
 * 사이트 전체 진입을 막는 미들웨어입니다.
 * 접속코드를 확인받은 적 없는 방문자는 /enter 화면으로 보냅니다.
 * (Netlify 배포로 인해 원 요청서의 "사내망 로컬 전용" 전제가 바뀌면서 추가된 보호 장치)
 */
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "gp_site_access";
const PUBLIC_PATHS = ["/enter", "/api/site-access"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname === "/favicon.ico";

  if (isPublic) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie === "granted") {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/enter";
  url.search = "";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
