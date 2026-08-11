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
import { getSessionEmployee, type SessionEmployee } from "@/lib/session";

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

export default function LearningPage() {
  const router = useRouter();
  const [employee, setEmployee] = useState<SessionEmployee | null>(null);
  const [items, setItems] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    const emp = getSessionEmployee();
    if (!emp) {
      router.replace("/");
      return;
    }
    setEmployee(emp);
    load(emp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function load(emp: SessionEmployee) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ employee_id: emp.employee_id, name: emp.name });
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
    if (!employee) return;
    setUpdatingId(rec.recommendation_id);
    try {
      const res = await fetch("/api/learning-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employee.employee_id,
          name: employee.name,
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
    return <div className="rounded-lg border bg-white p-6 text-sm text-red-600 shadow-sm">{error}</div>;
  }

  if (!items || items.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
        <p className="mb-4 text-gray-600">아직 추천받은 학습이 없습니다.</p>
        <Link
          href="/recommend"
          className="inline-block rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          AI 맞춤 추천 보러가기
        </Link>
      </div>
    );
  }

  const completedCount = items.filter((r) => r.status === "완료").length;
  const showRediagnoseBanner = completedCount >= RECOMMEND_COMPLETE_BANNER_THRESHOLD;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="mb-1 text-xl font-bold">내 학습 현황</h1>
        <p className="text-sm text-gray-500">
          <strong>{employee?.name}</strong>님, 학습을 진행하면서 상태를 바꿔 주세요.
        </p>
      </div>

      {showRediagnoseBanner && (
        <div className="rounded-lg border border-brand bg-blue-50 p-4 text-sm text-brand">
          벌써 {completedCount}개 학습을 완료하셨네요! 지금 다시 진단해서 성장한 모습을 확인해
          보시는 건 어떨까요?{" "}
          <Link href="/diagnosis" className="font-medium underline">
            재진단하기
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {LEARNING_STATUSES.map((status) => {
          const columnItems = items.filter((r) => r.status === status);
          return (
            <div key={status} className="rounded-lg border bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-bold">
                {status} <span className="text-gray-400">({columnItems.length})</span>
              </h2>
              <div className="space-y-3">
                {columnItems.map((rec) => (
                  <div key={rec.recommendation_id} className="rounded border p-3">
                    <div className="mb-1 flex flex-wrap items-center gap-1">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {rec.category}
                      </span>
                      <span className="text-xs text-gray-400">{rec.stage}</span>
                    </div>
                    <p className="mb-2 text-sm font-medium">{rec.title}</p>
                    {rec.completed_at && (
                      <p className="mb-2 text-xs text-gray-400">완료일: {rec.completed_at}</p>
                    )}
                    <select
                      value={rec.status}
                      onChange={(e) => handleStatusChange(rec, e.target.value)}
                      disabled={updatingId === rec.recommendation_id}
                      className="w-full rounded border px-2 py-1 text-xs"
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
                  <p className="text-xs text-gray-400">항목이 없습니다.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
