import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

// 모든 화면에 공통으로 나오는 레이아웃입니다. (상단 메뉴 막대 포함)
export const metadata: Metadata = {
  title: "그로우패스",
  description: "사내 역량진단 기반 학습 추천 앱",
};

const NAV_ITEMS = [
  { href: "/", label: "시작" },
  { href: "/diagnosis", label: "역량진단" },
  { href: "/result", label: "내 결과" },
  { href: "/recommend", label: "AI 추천" },
  { href: "/learning", label: "학습현황" },
  { href: "/settings", label: "설정" },
  { href: "/admin", label: "관리자" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-1 px-4 py-3 text-sm">
            <span className="mr-4 text-base font-bold text-brand">그로우패스</span>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded px-3 py-1.5 text-gray-600 hover:bg-gray-100 hover:text-brand"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
