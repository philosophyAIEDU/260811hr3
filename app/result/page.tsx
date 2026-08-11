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
import { getSessionEmployee, type SessionEmployee } from "@/lib/session";

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
  const [employee, setEmployee] = useState<SessionEmployee | null>(null);
  const [assessments, setAssessments] = useState<Assessment[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const emp = getSessionEmployee();
    if (!emp) {
      router.replace("/");
      return;
    }
    setEmployee(emp);

    (async () => {
      try {
        const params = new URLSearchParams({ employee_id: emp.employee_id, name: emp.name });
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

  if (loading) {
    return <p className="text-sm text-gray-500">불러오는 중...</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-white p-6 text-sm text-red-600 shadow-sm">{error}</div>
    );
  }

  if (!assessments || assessments.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
        <p className="mb-4 text-gray-600">아직 진단 이력이 없습니다.</p>
        <Link
          href="/diagnosis"
          className="inline-block rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          역량 자가진단 시작하기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="mb-1 text-xl font-bold">내 진단 결과</h1>
        <p className="text-sm text-gray-500">
          <strong>{employee?.name}</strong>님의 역량 진단 결과입니다.
        </p>
      </div>

      {assessments.length > 1 && (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <label className="mb-1 block text-sm font-medium">조회할 진단 회차</label>
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            {assessments.map((a, idx) => (
              <option key={a.assessment_id} value={a.assessment_id}>
                {a.assessed_at} {idx === 0 ? "(최신)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {selected && (
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
            <span>진단일시: {selected.assessed_at}</span>
            <span>희망직무: {selected.desired_job}</span>
          </div>
          <p className="mb-5 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm text-gray-700">
            {selected.career_goal}
          </p>

          <div className="space-y-4">
            {COMPETENCIES.map((c) => {
              const score = selected.scores.find((s) => s.competency_name === c.name);
              const current = score?.current_score ?? 0;
              const required = score?.required_level ?? 0;
              const gap = required - current;
              const isPriority = gap >= GAP_ALERT_THRESHOLD;

              return (
                <div key={c.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="flex items-center gap-2 text-gray-500">
                      {current} / {SCORE_MAX} (요구수준 {required})
                      {isPriority && (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                          우선 보완
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded bg-gray-100">
                    <div
                      className={`h-full rounded ${isPriority ? "bg-red-400" : "bg-brand"}`}
                      style={{ width: `${(current / SCORE_MAX) * 100}%` }}
                    />
                    <div
                      className="absolute top-0 h-full w-0.5 bg-gray-700"
                      style={{ left: `${(required / SCORE_MAX) * 100}%` }}
                      title={`요구수준 ${required}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {historyAscending.length > 1 && (
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold">역량별 점수 변화 (이력 비교)</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-xs">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="py-2 pr-3">역량</th>
                  {historyAscending.map((a) => (
                    <th key={a.assessment_id} className="px-2 py-2 text-center">
                      {a.assessed_at.slice(0, 10)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPETENCIES.map((c) => (
                  <tr key={c.name} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{c.name}</td>
                    {historyAscending.map((a) => {
                      const s = a.scores.find((x) => x.competency_name === c.name);
                      return (
                        <td key={a.assessment_id} className="px-2 py-2 text-center">
                          {s?.current_score ?? "-"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href="/diagnosis"
          className="flex-1 rounded border border-brand py-2 text-center text-sm font-medium text-brand hover:bg-blue-50"
        >
          새로 진단하기
        </Link>
        <Link
          href="/recommend"
          className="flex-1 rounded bg-brand py-2 text-center text-sm font-medium text-white hover:bg-brand-dark"
        >
          AI 맞춤 추천 보기
        </Link>
      </div>
    </div>
  );
}
