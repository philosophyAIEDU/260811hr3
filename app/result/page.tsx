"use client";

/**
 * 화면3: 내 진단 결과
 * 선택한 진단 회차의 역량별 현재점수 vs 요구수준 갭을 시각화하고,
 * 진단을 여러 번 했다면 역량별 점수 변화(이력)를 표로 비교해 보여줍니다.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { COMPETENCIES } from "@/lib/config/competencies";
import { GAP_ALERT_THRESHOLD, SCORE_MAX } from "@/lib/config/constants";
import { getDisplayName, getExistingUserId } from "@/lib/session";

interface CompetencyScore {
  competency_name: string;
  current_score: number;
  required_level: number;
}

interface Assessment {
  assessment_id: number;
  assessed_at: string;
  desired_job: string;
  career_goal: string;
  scores: CompetencyScore[];
}

export default function ResultPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [assessments, setAssessments] = useState<Assessment[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = getExistingUserId();
    if (!userId) {
      router.replace("/");
      return;
    }
    setDisplayName(getDisplayName());

    (async () => {
      try {
        const params = new URLSearchParams({ user_id: userId });
        const res = await fetch(`/api/diagnosis?${params.toString()}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "결과를 불러오지 못했습니다.");
          return;
        }

        setAssessments(data.assessments as Assessment[]);
        if (data.assessments.length > 0) {
          setSelectedId(data.assessments[0].assessment_id);
        }
      } catch {
        setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const selected = useMemo(
    () => assessments?.find((a) => a.assessment_id === selectedId) ?? null,
    [assessments, selectedId]
  );

  // 이력 비교용: 오래된 순서로 정렬 (표를 왼쪽→오른쪽으로 읽으면 시간 흐름이 됨)
  const historyAscending = useMemo(
    () => (assessments ? [...assessments].reverse() : []),
    [assessments]
  );

  // 요약 숫자 계산
  const summary = useMemo(() => {
    if (!selected) return null;
    const total = selected.scores.reduce((sum, s) => sum + s.current_score, 0);
    const avg = selected.scores.length ? total / selected.scores.length : 0;
    const priority = selected.scores.filter(
      (s) => s.required_level - s.current_score >= GAP_ALERT_THRESHOLD
    ).length;
    const met = selected.scores.filter((s) => s.current_score >= s.required_level).length;
    return {
      avg: Math.round(avg * 10) / 10,
      priority,
      met,
      totalCount: selected.scores.length,
    };
  }, [selected]);

  if (loading) {
    return <p className="text-sm text-gray-500">불러오는 중...</p>;
  }

  if (error) {
    return <div className="gp-card p-6 text-sm text-red-600">{error}</div>;
  }

  if (!assessments || assessments.length === 0) {
    return (
      <div className="gp-card p-12 text-center">
        <p className="mb-5 text-gray-500">아직 진단 이력이 없습니다.</p>
        <Link href="/diagnosis" className="gp-btn">
          역량 자가진단 시작하기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">내 진단 결과</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            {displayName ? `${displayName}님의 ` : ""}역량 진단 결과입니다.
          </p>
        </div>

        {assessments.length > 1 && (
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="gp-input w-auto py-2 text-xs"
          >
            {assessments.map((a, idx) => (
              <option key={a.assessment_id} value={a.assessment_id}>
                {a.assessed_at} {idx === 0 ? "(최신)" : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 요약 카드 3개 */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <div className="gp-card p-4 text-center sm:p-5">
            <p className="text-xs text-gray-500">평균 점수</p>
            <p className="mt-1 text-2xl font-extrabold text-brand">{summary.avg}</p>
          </div>
          <div className="gp-card p-4 text-center sm:p-5">
            <p className="text-xs text-gray-500">기준 충족</p>
            <p className="mt-1 text-2xl font-extrabold text-navy">
              {summary.met}
              <span className="text-base font-semibold text-gray-400">/{summary.totalCount}</span>
            </p>
          </div>
          <div className="gp-card p-4 text-center sm:p-5">
            <p className="text-xs text-gray-500">우선 보완</p>
            <p className="mt-1 text-2xl font-extrabold text-rose-500">{summary.priority}</p>
          </div>
        </div>
      )}

      {selected && (
        <section className="gp-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50/70 px-6 py-3.5">
            <h2 className="gp-section-title">역량별 현재 수준</h2>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              희망직무 · {selected.desired_job}
            </span>
          </div>

          <div className="p-6">
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <p className="mb-1 text-xs font-semibold text-gray-400">나의 커리어 목표</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
                {selected.career_goal}
              </p>
            </div>

            {/* 범례 */}
            <div className="mb-5 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-5 rounded-full bg-brand" /> 현재 점수
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-0.5 bg-navy" /> 희망직무 요구수준
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-5 rounded-full bg-rose-400" /> 우선 보완 대상
              </span>
            </div>

            <div className="space-y-4">
              {COMPETENCIES.map((c) => {
                const score = selected.scores.find((s) => s.competency_name === c.name);
                const current = score?.current_score ?? 0;
                const required = score?.required_level ?? 0;
                const gap = required - current;
                const isPriority = gap >= GAP_ALERT_THRESHOLD;

                return (
                  <div key={c.name}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-semibold text-navy">{c.name}</span>
                      <span className="flex items-center gap-2 text-xs text-gray-500">
                        <span>
                          <strong className="text-sm font-bold text-navy">{current}</strong>
                          <span className="text-gray-400"> / 요구 {required}</span>
                        </span>
                        {isPriority && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-500">
                            우선 보완
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isPriority ? "bg-rose-400" : "bg-brand"
                        }`}
                        style={{ width: `${(current / SCORE_MAX) * 100}%` }}
                      />
                      <div
                        className="absolute top-0 h-full w-0.5 bg-navy"
                        style={{ left: `${(required / SCORE_MAX) * 100}%` }}
                        title={`요구수준 ${required}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {historyAscending.length > 1 && (
        <section className="gp-card overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/70 px-6 py-3.5">
            <h2 className="gp-section-title">역량별 점수 변화</h2>
          </div>
          <div className="overflow-x-auto p-6">
            <table className="w-full min-w-max text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400">
                  <th className="pb-2.5 pr-4 font-semibold">역량</th>
                  {historyAscending.map((a, idx) => (
                    <th key={a.assessment_id} className="px-3 pb-2.5 text-center font-semibold">
                      {a.assessed_at.slice(0, 10)}
                      {idx === historyAscending.length - 1 && (
                        <span className="ml-1 text-brand">(최신)</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPETENCIES.map((c) => {
                  const first = historyAscending[0].scores.find(
                    (x) => x.competency_name === c.name
                  )?.current_score;
                  const last = historyAscending[historyAscending.length - 1].scores.find(
                    (x) => x.competency_name === c.name
                  )?.current_score;
                  const diff = (last ?? 0) - (first ?? 0);

                  return (
                    <tr key={c.name} className="border-b border-gray-100 last:border-0">
                      <td className="py-2.5 pr-4 font-semibold text-navy">
                        {c.name}
                        {diff > 0 && (
                          <span className="ml-1.5 text-[11px] font-bold text-brand">
                            ▲{diff}
                          </span>
                        )}
                        {diff < 0 && (
                          <span className="ml-1.5 text-[11px] font-bold text-rose-400">
                            ▼{Math.abs(diff)}
                          </span>
                        )}
                      </td>
                      {historyAscending.map((a) => {
                        const s = a.scores.find((x) => x.competency_name === c.name);
                        return (
                          <td
                            key={a.assessment_id}
                            className="px-3 py-2.5 text-center text-sm text-gray-600"
                          >
                            {s?.current_score ?? "-"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Link href="/diagnosis" className="gp-btn-outline flex-1">
          새로 진단하기
        </Link>
        <Link href="/recommend" className="gp-btn flex-1">
          AI 맞춤 추천 보기 →
        </Link>
      </div>
    </div>
  );
}
