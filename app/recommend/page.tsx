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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="mb-1 text-xl font-bold">AI 맞춤 추천 · 성장 로드맵</h1>
        <p className="text-sm text-gray-500">
          {displayName ? `${displayName}님의 ` : ""}희망직무({desiredJob || "-"}) 진단 결과를
          바탕으로 만든 추천입니다.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
          {error.includes("설정 화면") && (
            <Link href="/settings" className="ml-1 underline">
              설정 화면으로 이동
            </Link>
          )}
        </div>
      )}

      {recommendations && recommendations.length === 0 && !error && (
        <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
          <p className="mb-4 text-gray-600">아직 만들어진 추천이 없습니다.</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {generating ? "만드는 중... (최대 1분 정도 걸릴 수 있어요)" : "AI 맞춤 추천 만들기"}
          </button>
        </div>
      )}

      {recommendations && recommendations.length > 0 && (
        <>
          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded border border-brand px-3 py-1.5 text-xs font-medium text-brand hover:bg-blue-50 disabled:opacity-50"
            >
              {generating ? "다시 만드는 중..." : "다시 만들기"}
            </button>
          </div>

          {ROADMAP_STAGES.map((stage) => {
            const items = recommendations.filter((r) => r.stage === stage);
            if (items.length === 0) return null;
            return (
              <div key={stage} className="rounded-lg border bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-bold text-brand">{stage} 단계</h2>
                <div className="space-y-3">
                  {items.map((rec) => (
                    <div key={rec.recommendation_id} className="rounded border p-3">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {rec.category}
                        </span>
                        {rec.platform && (
                          <span className="text-xs text-gray-400">{rec.platform}</span>
                        )}
                        <span className="font-medium">{rec.title}</span>
                      </div>
                      <p className="mb-2 text-sm text-gray-600">{rec.reason}</p>
                      {rec.search_keyword && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>검색어: {rec.search_keyword}</span>
                          <button
                            onClick={() => handleCopy(rec)}
                            className="rounded border px-2 py-0.5 hover:bg-gray-50"
                          >
                            {copiedId === rec.recommendation_id ? "복사됨" : "복사"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <Link
            href="/learning"
            className="block rounded bg-brand py-3 text-center text-sm font-medium text-white hover:bg-brand-dark"
          >
            내 학습 현황에서 진행상태 관리하기
          </Link>
        </>
      )}
    </div>
  );
}
