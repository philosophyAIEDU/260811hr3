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
      <div className="mx-auto max-w-sm pt-8">
        <div className="gp-card overflow-hidden">
          <div className="bg-navy px-6 py-7 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-lg">
              🔒
            </div>
            <h1 className="text-lg font-bold text-white">HR 관리자</h1>
            <p className="mt-1 text-xs text-gray-400">전사 진단 현황을 확인합니다</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3 p-6">
            <input
              type="password"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              placeholder="관리자 코드"
              className="gp-input"
              autoFocus
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className="gp-btn w-full">
              {loading ? "확인 중..." : "입장"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const participationRate =
    stats.totalEmployees > 0
      ? Math.round((stats.diagnosedEmployees / stats.totalEmployees) * 100)
      : 0;

  const maxGap = stats.competencyGapTop5[0]?.averageGap || 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">HR 관리자</h1>
          <p className="mt-1.5 text-sm text-gray-500">전 직원 진단 결과를 요약해서 보여드립니다.</p>
        </div>
        <button onClick={handleExport} disabled={exporting} className="gp-btn px-5 py-2.5">
          {exporting ? "만드는 중..." : "⬇ 엑셀 다운로드"}
        </button>
      </div>

      {error && (
        <p className="rounded-xl2 border border-red-200 bg-red-50 px-5 py-3.5 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* 요약 지표 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="gp-card p-5">
          <p className="text-xs text-gray-500">참여자</p>
          <p className="mt-1.5 text-2xl font-extrabold text-navy">
            {stats.totalEmployees}
            <span className="ml-0.5 text-sm font-semibold text-gray-400">명</span>
          </p>
        </div>
        <div className="gp-card p-5">
          <p className="text-xs text-gray-500">진단 완료</p>
          <p className="mt-1.5 text-2xl font-extrabold text-brand">
            {stats.diagnosedEmployees}
            <span className="ml-0.5 text-sm font-semibold text-gray-400">명</span>
          </p>
        </div>
        <div className="gp-card p-5">
          <p className="text-xs text-gray-500">진단 완료율</p>
          <p className="mt-1.5 text-2xl font-extrabold text-violet-deep">{participationRate}%</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 부서별 평균 */}
        <section className="gp-card overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/70 px-6 py-3.5">
            <h2 className="gp-section-title">부서별 평균 역량점수</h2>
            <p className="mt-0.5 text-xs text-gray-400">각 직원의 최신 진단 기준</p>
          </div>
          <div className="p-6">
            {stats.departmentAverages.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">아직 진단 데이터가 없습니다.</p>
            ) : (
              <div className="space-y-3.5">
                {stats.departmentAverages.map((d) => (
                  <div key={d.department}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-semibold text-navy">{d.department}</span>
                      <span className="text-xs text-gray-500">
                        <strong className="text-sm font-bold text-navy">{d.average}</strong>
                        <span className="text-gray-400"> · {d.employeeCount}명</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-brand transition-all duration-500"
                        style={{ width: `${(d.average / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 부족역량 TOP5 */}
        <section className="gp-card overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/70 px-6 py-3.5">
            <h2 className="gp-section-title">전사 부족역량 TOP 5</h2>
            <p className="mt-0.5 text-xs text-gray-400">요구수준 − 현재점수 평균이 큰 순서</p>
          </div>
          <div className="p-6">
            {stats.competencyGapTop5.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">아직 진단 데이터가 없습니다.</p>
            ) : (
              <div className="space-y-3.5">
                {stats.competencyGapTop5.map((c, idx) => (
                  <div key={c.competency} className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                        idx === 0
                          ? "bg-rose-100 text-rose-600"
                          : idx === 1
                          ? "bg-orange-100 text-orange-600"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="w-[104px] shrink-0 whitespace-nowrap text-[13px] font-semibold text-navy">
                      {c.competency}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-rose-400 transition-all duration-500"
                        style={{ width: `${Math.max((c.averageGap / maxGap) * 100, 4)}%` }}
                      />
                    </div>
                    <span className="w-9 shrink-0 text-right text-xs font-bold text-gray-500">
                      {c.averageGap}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
