"use client";

/**
 * 화면1: 시작 화면
 *
 * 사번이나 아이디를 입력받지 않습니다. 버튼 하나로 바로 시작할 수 있습니다.
 * 본인 데이터 구분은 브라우저가 자동으로 발급하는 무작위 식별자로 처리합니다.
 * (lib/session.ts 참고 — 사용자는 이 과정을 알 필요가 없습니다)
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDisplayName, getExistingUserId, getOrCreateUserId, resetUser } from "@/lib/session";

const STEPS = [
  {
    no: "01",
    title: "역량 자가진단",
    desc: "10개 역량을 5점 척도로 체크합니다. 2~3분이면 충분합니다.",
    tone: "from-brand-400 to-brand-600",
  },
  {
    no: "02",
    title: "갭 분석 리포트",
    desc: "희망직무가 요구하는 수준과 지금 내 수준의 차이를 한눈에 봅니다.",
    tone: "from-violet to-violet-deep",
  },
  {
    no: "03",
    title: "AI 맞춤 학습 추천",
    desc: "부족한 역량을 채울 강의·도서를 3·6·12개월 로드맵으로 받습니다.",
    tone: "from-navy-soft to-navy",
  },
];

export default function StartPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);
  const [displayName, setName] = useState("");

  useEffect(() => {
    const existingId = getExistingUserId();
    setName(getDisplayName());

    if (!existingId) {
      setChecked(true);
      return;
    }

    // 예전에 진단한 기록이 있는지 확인해서 "내 결과 보기" 버튼을 보여줄지 정합니다.
    fetch(`/api/diagnosis?user_id=${encodeURIComponent(existingId)}`)
      .then((res) => res.json())
      .then((data) => setHasHistory(Array.isArray(data.assessments) && data.assessments.length > 0))
      .catch(() => setHasHistory(false))
      .finally(() => setChecked(true));
  }, []);

  function start() {
    getOrCreateUserId(); // 아직 없으면 이 시점에 자동 발급됩니다.
    router.push("/diagnosis");
  }

  function handleReset() {
    resetUser();
    setHasHistory(false);
    setName("");
  }

  return (
    <div className="space-y-10">
      {/* 히어로 배너 */}
      <section className="relative overflow-hidden rounded-xl2 bg-navy px-6 py-12 sm:px-12 sm:py-16">
        {/* 배경 장식 — 은은한 빛 번짐 효과 */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-violet opacity-40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 right-32 h-64 w-64 rounded-full bg-brand opacity-30 blur-3xl"
        />

        <div className="relative max-w-xl">
          <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-200 ring-1 ring-inset ring-white/20">
            AI 기반 커리어 성장 진단
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            지금 내 역량,
            <br />
            어디까지 왔을까요?
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-gray-300 sm:text-base">
            10개 항목만 체크하면 희망하는 직무에 필요한 역량과의 차이를 알려드립니다.
            <br className="hidden sm:block" />
            그 차이를 메울 학습 계획까지 AI가 함께 만들어 드립니다.
          </p>

          {hasHistory ? (
            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
              <button
                onClick={() => router.push("/result")}
                className="rounded-lg bg-brand px-6 py-3.5 text-sm font-bold text-white transition hover:bg-brand-600"
              >
                내 결과 보기
              </button>
              <button
                onClick={start}
                className="rounded-lg bg-white/10 px-6 py-3.5 text-sm font-bold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/20"
              >
                새로 진단하기
              </button>
            </div>
          ) : (
            <button
              onClick={start}
              disabled={!checked}
              className="mt-8 rounded-lg bg-brand px-7 py-3.5 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              바로 시작하기 →
            </button>
          )}

          <p className="mt-4 text-xs text-gray-400">
            {hasHistory
              ? `${displayName ? `${displayName}님, ` : ""}지난 진단 결과가 저장되어 있습니다.`
              : "가입도, 사번 입력도 필요 없습니다."}
          </p>
        </div>
      </section>

      {/* 진행 단계 안내 */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-xl font-bold text-navy">이렇게 진행됩니다</h2>
          <span className="text-xs text-gray-400">전체 소요 시간 약 5분</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <article key={step.no} className="gp-card gp-card-hover overflow-hidden">
              <div className={`h-1.5 w-full bg-gradient-to-r ${step.tone}`} />
              <div className="p-6">
                <span className="text-xs font-bold text-brand">STEP {step.no}</span>
                <h3 className="mt-2 text-base font-bold text-navy">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{step.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 안내 문구 */}
      <section className="gp-card p-6">
        <h2 className="gp-section-title mb-2">알아두시면 좋은 점</h2>
        <p className="text-sm leading-relaxed text-gray-500">
          진단 결과는 <strong className="font-semibold text-navy">지금 쓰고 계신 이 브라우저</strong>에
          연결되어 저장됩니다. 같은 브라우저로 다시 들어오면 이어서 볼 수 있지만, 다른 기기나 다른
          브라우저에서는 새로 시작됩니다. 진단 결과는 개인 성장 지원 목적으로만 쓰이며 인사 평가에
          사용되지 않습니다.
          {hasHistory && (
            <>
              {" "}
              <button
                onClick={handleReset}
                className="font-medium text-brand underline underline-offset-2 hover:text-brand-600"
              >
                기록 지우고 새로 시작
              </button>
            </>
          )}
        </p>
      </section>
    </div>
  );
}
