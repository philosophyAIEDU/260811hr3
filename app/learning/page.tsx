"use client";

/**
 * 화면5: 내 학습 현황
 * 화면4에서 만든 추천 항목을 예정/수강중/완료 3단 보드로 보여주고, 상태를 바꿀 수 있습니다.
 * 완료 항목이 일정 개수 이상 쌓이면 재진단 안내 배너를 보여줍니다.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LEARNING_STATUSES, RECOMMEND_COMPLETE_BANNER_THRESHOLD } from "@/lib/config/constants";
import { getDisplayName, getExistingUserId } from "@/lib/session";

interface Recommendation {
  recommendation_id: number;
  category: string;
  title: string;
  search_keyword: string;
  platform: string;
  reason: string;
  stage: string;
  status: string;
  completed_at: string | null;
}

/** 상태별 색상 — 보드 머리말과 표시에 씁니다. */
const STATUS_STYLE: Record<string, { dot: string; head: string; badge: string }> = {
  예정: { dot: "bg-gray-300", head: "text-gray-500", badge: "bg-gray-100 text-gray-500" },
  수강중: { dot: "bg-violet", head: "text-violet-deep", badge: "bg-violet/10 text-violet-deep" },
  완료: { dot: "bg-brand", head: "text-brand-700", badge: "bg-brand-50 text-brand-700" },
};

export default function LearningPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [items, setItems] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    const id = getExistingUserId();
    if (!id) {
      router.replace("/");
      return;
    }
    setUserId(id);
    setDisplayName(getDisplayName());
    load(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function load(id: string) {
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
      setItems(data.exists ? data.recommendations : []);
    } catch {
      setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(rec: Recommendation, status: string) {
    if (!userId) return;
    setUpdatingId(rec.recommendation_id);
    try {
      const res = await fetch("/api/learning-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          recommendation_id: rec.recommendation_id,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "상태 변경 중 문제가 발생했습니다.");
        return;
      }
      setItems((prev) =>
        prev
          ? prev.map((r) => (r.recommendation_id === rec.recommendation_id ? data.recommendation : r))
          : prev
      );
    } catch {
      setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">불러오는 중...</p>;
  }

  if (error) {
    return <div className="gp-card p-6 text-sm text-red-600">{error}</div>;
  }

  if (!items || items.length === 0) {
    return (
      <div className="gp-card p-12 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">
          📚
        </div>
        <p className="mb-1 text-base font-bold text-navy">아직 추천받은 학습이 없습니다</p>
        <p className="mb-6 text-sm text-gray-500">
          AI 맞춤 추천을 먼저 받으면 여기에서 진행 상태를 관리할 수 있습니다.
        </p>
        <Link href="/recommend" className="gp-btn">
          AI 맞춤 추천 보러가기
        </Link>
      </div>
    );
  }

  const completedCount = items.filter((r) => r.status === "완료").length;
  const showRediagnoseBanner = completedCount >= RECOMMEND_COMPLETE_BANNER_THRESHOLD;
  const progressPercent = Math.round((completedCount / items.length) * 100);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">내 학습 현황</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          {displayName ? `${displayName}님, ` : ""}학습을 진행하면서 상태를 바꿔 주세요.
        </p>
      </div>

      {/* 전체 진행률 */}
      <section className="gp-card p-5">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-navy">전체 진행률</span>
          <span className="text-sm">
            <strong className="text-lg font-extrabold text-brand">{completedCount}</strong>
            <span className="text-gray-400"> / {items.length} 완료</span>
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-brand transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </section>

      {showRediagnoseBanner && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl2 border border-brand-200 bg-brand-50 px-5 py-4">
          <span className="text-xl">🎉</span>
          <p className="flex-1 text-sm text-brand-800">
            벌써 <strong className="font-bold">{completedCount}개</strong> 학습을 완료하셨네요! 지금
            다시 진단해서 성장한 모습을 확인해 보시는 건 어떨까요?
          </p>
          <Link
            href="/diagnosis"
            className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-600"
          >
            재진단하기
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {LEARNING_STATUSES.map((status) => {
          const columnItems = items.filter((r) => r.status === status);
          const style = STATUS_STYLE[status];

          return (
            <div key={status} className="rounded-xl2 bg-gray-100/70 p-3">
              <div className="mb-3 flex items-center gap-2 px-1.5 py-1">
                <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                <h2 className={`text-sm font-bold ${style.head}`}>{status}</h2>
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-500">
                  {columnItems.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {columnItems.map((rec) => (
                  <div key={rec.recommendation_id} className="rounded-lg bg-white p-4 shadow-card">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${style.badge}`}>
                        {rec.category}
                      </span>
                      <span className="text-[11px] text-gray-400">{rec.stage}</span>
                    </div>

                    <p className="mb-1 text-sm font-bold leading-snug text-navy">{rec.title}</p>
                    {rec.completed_at && (
                      <p className="mb-2 text-[11px] text-brand">완료일 {rec.completed_at}</p>
                    )}

                    <select
                      value={rec.status}
                      onChange={(e) => handleStatusChange(rec, e.target.value)}
                      disabled={updatingId === rec.recommendation_id}
                      className="mt-2 w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-100 disabled:opacity-50"
                    >
                      {LEARNING_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                {columnItems.length === 0 && (
                  <p className="rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-xs text-gray-400">
                    항목이 없습니다
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
