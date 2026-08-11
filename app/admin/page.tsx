"use client";

/**
 * 화면6: HR 관리자
 * 관리자 코드를 입력해야 통계를 볼 수 있습니다. (화면7의 공용 API 키 저장과 같은 코드)
 * 부서별 평균 역량점수, 전사 부족역량 TOP5, 엑셀 다운로드를 제공합니다.
 */
import { useState, type FormEvent } from "react";

interface DepartmentAverage {
  department: string;
  average: number;
  employeeCount: number;
}

interface CompetencyGap {
  competency: string;
  averageGap: number;
}

interface Stats {
  totalEmployees: number;
  diagnosedEmployees: number;
  departmentAverages: DepartmentAverage[];
  competencyGapTop5: CompetencyGap[];
}

export default function AdminPage() {
  const [adminCode, setAdminCode] = useState("");
  const [authedCode, setAuthedCode] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!adminCode.trim()) {
      setError("관리자 코드를 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ admin_code: adminCode.trim() });
      const res = await fetch(`/api/admin?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "조회 중 문제가 발생했습니다.");
        return;
      }
      setStats(data);
      setAuthedCode(adminCode.trim());
    } catch {
      setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setError("");
    setExporting(true);
    try {
      const res = await fetch("/api/admin/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_code: authedCode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "엑셀 다운로드 중 문제가 발생했습니다.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `growthpath_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setExporting(false);
    }
  }

  if (!stats) {
    return (
      <div className="mx-auto max-w-sm">
        <h1 className="mb-1 text-xl font-bold">HR 관리자</h1>
        <p className="mb-6 text-sm text-gray-500">관리자 코드를 입력해 주세요.</p>
        <form onSubmit={handleLogin} className="space-y-3 rounded-lg border bg-white p-5 shadow-sm">
          <input
            type="password"
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            placeholder="관리자 코드"
            className="w-full rounded border px-3 py-2 text-sm"
            autoFocus
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-brand py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {loading ? "확인 중..." : "입장"}
          </button>
        </form>
      </div>
    );
  }

  const participationRate =
    stats.totalEmployees > 0
      ? Math.round((stats.diagnosedEmployees / stats.totalEmployees) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-xl font-bold">HR 관리자</h1>
          <p className="text-sm text-gray-500">전 직원 진단 결과를 요약해서 보여드립니다.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {exporting ? "만드는 중..." : "엑셀 다운로드"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 text-center shadow-sm">
          <p className="text-xs text-gray-500">등록 직원</p>
          <p className="text-2xl font-bold">{stats.totalEmployees}명</p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-center shadow-sm">
          <p className="text-xs text-gray-500">진단 완료</p>
          <p className="text-2xl font-bold">{stats.diagnosedEmployees}명</p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-center shadow-sm">
          <p className="text-xs text-gray-500">진단 참여율</p>
          <p className="text-2xl font-bold">{participationRate}%</p>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold">부서별 평균 역량점수 (최신 진단 기준)</h2>
        {stats.departmentAverages.length === 0 ? (
          <p className="text-sm text-gray-400">아직 진단 데이터가 없습니다.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-2">부서</th>
                <th className="py-2 text-center">인원</th>
                <th className="py-2 text-center">평균 점수</th>
              </tr>
            </thead>
            <tbody>
              {stats.departmentAverages.map((d) => (
                <tr key={d.department} className="border-b last:border-0">
                  <td className="py-2">{d.department}</td>
                  <td className="py-2 text-center">{d.employeeCount}명</td>
                  <td className="py-2 text-center">{d.average}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold">전사 부족역량 TOP5 (요구수준 − 현재점수 평균)</h2>
        {stats.competencyGapTop5.length === 0 ? (
          <p className="text-sm text-gray-400">아직 진단 데이터가 없습니다.</p>
        ) : (
          <ol className="space-y-1 text-sm">
            {stats.competencyGapTop5.map((c, idx) => (
              <li key={c.competency} className="flex justify-between">
                <span>
                  {idx + 1}. {c.competency}
                </span>
                <span className="text-gray-500">평균 격차 {c.averageGap}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
