"use client";

/**
 * 화면4: AI 맞춤 추천 + 성장 로드맵
 * 가장 최근 진단을 기준으로 Gemini가 만든 추천을 3개월/6개월/12개월 단계로 묶어 보여줍니다.
 * 추천이 없으면 "만들기" 버튼을, 이미 있으면 내용과 "다시 만들기" 버튼을 보여줍니다.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROADMAP_STAGES } from "@/lib/config/constants";
import { getPersonalGeminiKey } from "@/lib/personalKey";
import { getDisplayName, getExistingUserId } from "@/lib/session";

interface Recommendation {
  recommendation_id: number;
  category: string;
  title: string;
  search_keyword: string;
  platform: string;
  reason: string;
  stage: (typeof ROADMAP_STAGES)[number];
  status: string;
}

/** 구분(사내강의/외부주제/도서)마다 카드 위쪽 색 띠를 다르게 해서 한눈에 구분되게 합니다. */
const CATEGORY_STYLE: Record<string, { bar: string; chip: string }> = {
  사내강의: { bar: "from-brand-400 to-brand-600", chip: "bg-brand-50 text-brand-700" },
  외부주제: { bar: "from-violet to-violet-deep", chip: "bg-violet/10 text-violet-deep" },
  도서: { bar: "from-amber-400 to-orange-500", chip: "bg-amber-50 text-amber-700" },
};

const STAGE_LABEL: Record<string, string> = {
  "3개월": "지금 바로 시작",
  "6개월": "기반을 다지는 시기",
  "12개월": "전문성을 완성하는 시기",
};

export default function RecommendPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [assessmentId, setAssessmentId] = useState<number | null>(null);
  const [desiredJob, setDesiredJob] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    const id = getExistingUserId();
    if (!id) {
      router.replace("/");
      return;
    }
    setUserId(id);
    setDisplayName(getDisplayName());
    loadExisting(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadExisting(id: string) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ user_id: id });
      const res = await fetch(`/api/recommend?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "정보를 불러오지 못했습니다.");
        return;
      }
      setAssessmentId(data.assessment_id);
      setDesiredJob(data.desired_job);
      setRecommendations(data.exists ? data.recommendations : []);
    } catch {
      setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!userId) return;
    setError("");
    setGenerating(true);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          assessment_id: assessmentId,
          personal_api_key: getPersonalGeminiKey(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "AI 추천을 만드는 중 문제가 발생했습니다.");
        return;
      }
      setRecommendations(data.recommendations);
    } catch {
      setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy(rec: Recommendation) {
    const text = rec.search_keyword || rec.title;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(rec.recommendation_id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // 클립보드 접근이 막힌 브라우저에서는 조용히 무시합니다.
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">불러오는 중...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">AI 맞춤 추천 · 성장 로드맵</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            {displayName ? `${displayName}님의 ` : ""}희망직무
            <span className="mx-1 font-semibold text-brand">{desiredJob || "-"}</span>
            진단 결과를 바탕으로 만든 추천입니다.
          </p>
        </div>

        {recommendations && recommendations.length > 0 && (
          <button onClick={handleGenerate} disabled={generating} className="gp-btn-ghost">
            {generating ? "다시 만드는 중..." : "↻ 다시 만들기"}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl2 border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
          {error}
          {error.includes("설정 화면") && (
            <Link href="/settings" className="ml-1 font-semibold underline underline-offset-2">
              설정 화면으로 이동
            </Link>
          )}
        </div>
      )}

      {recommendations && recommendations.length === 0 && !error && (
        <div className="gp-card p-12 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-2xl">
            ✨
          </div>
          <p className="mb-1 text-base font-bold text-navy">아직 만들어진 추천이 없습니다</p>
          <p className="mb-6 text-sm text-gray-500">
            진단 결과를 바탕으로 나에게 맞는 학습 로드맵을 만들어 드립니다.
          </p>
          <button onClick={handleGenerate} disabled={generating} className="gp-btn">
            {generating ? "만드는 중... (최대 1분)" : "AI 맞춤 추천 만들기"}
          </button>
        </div>
      )}

      {recommendations && recommendations.length > 0 && (
        <>
          {ROADMAP_STAGES.map((stage, stageIdx) => {
            const items = recommendations.filter((r) => r.stage === stage);
            if (items.length === 0) return null;

            return (
              <section key={stage}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                    {stageIdx + 1}
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-navy">{stage}</h2>
                    <p className="text-xs text-gray-400">{STAGE_LABEL[stage]}</p>
                  </div>
                  <span className="ml-auto text-xs font-medium text-gray-400">
                    {items.length}개 과정
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((rec) => {
                    const style = CATEGORY_STYLE[rec.category] ?? CATEGORY_STYLE.사내강의;
                    return (
                      <article
                        key={rec.recommendation_id}
                        className="gp-card gp-card-hover flex flex-col overflow-hidden"
                      >
                        <div className={`h-1.5 w-full bg-gradient-to-r ${style.bar}`} />
                        <div className="flex flex-1 flex-col p-5">
                          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${style.chip}`}
                            >
                              {rec.category}
                            </span>
                            {rec.platform && (
                              <span className="text-[11px] text-gray-400">{rec.platform}</span>
                            )}
                          </div>

                          <h3 className="mb-2 text-sm font-bold leading-snug text-navy">
                            {rec.title}
                          </h3>
                          <p className="mb-4 flex-1 text-xs leading-relaxed text-gray-500">
                            {rec.reason}
                          </p>

                          {rec.search_keyword && (
                            <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                              <span className="truncate text-[11px] text-gray-400">
                                검색어: {rec.search_keyword}
                              </span>
                              <button
                                onClick={() => handleCopy(rec)}
                                className="shrink-0 rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-500 transition hover:border-brand hover:text-brand"
                              >
                                {copiedId === rec.recommendation_id ? "복사됨 ✓" : "복사"}
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <Link
            href="/learning"
            className="gp-btn w-full py-4 text-base"
          >
            내 학습 현황에서 진행상태 관리하기 →
          </Link>
        </>
      )}
    </div>
  );
}
