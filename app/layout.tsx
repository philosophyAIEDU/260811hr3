import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

// 모든 화면에 공통으로 나오는 레이아웃입니다. (머리말 + 본문 + 꼬리말)
export const metadata: Metadata = {
  title: "그로우패스 — 사내 역량진단 학습 추천",
  description: "역량을 스스로 점검하고 나에게 맞는 학습을 추천받는 사내 서비스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 text-navy">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mt-16 border-t border-gray-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-8 text-xs leading-relaxed text-gray-400">
            <p className="mb-1 font-semibold text-gray-500">그로우패스</p>
            사내 임직원 역량 진단 및 학습 추천 서비스입니다. 진단 결과는 개인 성장 지원 목적으로만
            활용되며, 인사 평가에 사용되지 않습니다.
          </div>
        </footer>
      </body>
    </html>
  );
}
