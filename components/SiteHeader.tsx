"use client";

/**
 * 모든 화면 위쪽에 공통으로 나오는 머리말입니다.
 * 사내 학습 플랫폼 화면처럼 "얇은 상단 줄 + 로고와 메뉴가 있는 본 머리말" 2단으로 구성했습니다.
 * 지금 보고 있는 화면의 메뉴에는 민트색 밑줄이 생겨 위치를 알 수 있습니다.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

const MAIN_NAV = [
  { href: "/diagnosis", label: "역량진단" },
  { href: "/result", label: "내 결과" },
  { href: "/recommend", label: "AI 추천" },
  { href: "/learning", label: "학습현황" },
];

const UTILITY_NAV = [
  { href: "/settings", label: "설정" },
  { href: "/admin", label: "HR 관리자" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-30 bg-white">
      {/* 얇은 상단 줄 — 자주 쓰지 않는 메뉴를 모아둡니다 */}
      <div className="border-b border-gray-100 bg-gray-50/80">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-4 px-4 py-1.5">
          {UTILITY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs text-gray-500 transition hover:text-brand"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 본 머리말 — 왼쪽 로고, 오른쪽 주요 메뉴 */}
      <div className="border-b border-gray-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-black text-white">
                G
              </span>
              <span className="text-xl font-extrabold tracking-tight text-navy">
                그로우<span className="text-brand">패스</span>
              </span>
            </Link>
            {/* 이 사이트가 무엇을 하는 곳인지 한 줄로 알려줍니다 */}
            <p className="hidden border-l border-gray-200 pl-3 text-xs text-gray-500 lg:block">
              내 역량을 진단하고 AI가 맞춤 학습을 추천하는 사내 성장 지원 서비스
            </p>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {MAIN_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-4 py-2 text-sm font-semibold transition ${
                  isActive(item.href) ? "text-brand" : "text-gray-600 hover:text-navy"
                }`}
              >
                {item.label}
                {isActive(item.href) && (
                  <span className="absolute inset-x-3 -bottom-[15px] h-[3px] rounded-full bg-brand" />
                )}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* 화면이 좁을 때는 한 줄 설명을 로고 아래로 내려서 보여줍니다 */}
      <p className="border-b border-gray-100 bg-white px-4 py-2 text-center text-[11px] text-gray-500 lg:hidden">
        내 역량을 진단하고 AI가 맞춤 학습을 추천하는 사내 성장 지원 서비스
      </p>

      {/* 화면이 좁을 때(스마트폰) 쓰는 메뉴 — 옆으로 밀어서 볼 수 있습니다 */}
      <div className="border-b border-gray-200 md:hidden">
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 py-2">
          {MAIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                isActive(item.href)
                  ? "bg-brand text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
