"use client";

/**
 * 화면2: 역량 자가진단 설문
 *
 * 필수 입력은 희망직무, 커리어목표, 역량 10개 점수뿐입니다.
 * 이름·부서·현재직무는 선택 입력이며, 넣으면 AI 추천이 더 정확해지고
 * HR 관리자 화면의 부서별 통계에 반영됩니다. 비워둬도 진단은 정상 진행됩니다.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COMPETENCIES } from "@/lib/config/competencies";
import { JOB_LIST } from "@/lib/config/jobRequirements";
import { SCORE_MAX, SCORE_MIN } from "@/lib/config/constants";
import { getDisplayName, getOrCreateUserId, setDisplayName } from "@/lib/session";

const SCORE_LABELS: Record<number, string> = {
  1: "거의 못함",
  2: "미흡",
  3: "보통",
  4: "잘함",
  5: "매우 잘함",
};

const scoreOptions = Array.from(
  { length: SCORE_MAX - SCORE_MIN + 1 },
  (_, i) => SCORE_MIN + i
);

export default function DiagnosisPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");

  const [desiredJob, setDesiredJob] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(COMPETENCIES.map((c) => [c.name, 3]))
  );

  // 선택 입력
  const [showOptional, setShowOptional] = useState(false);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [currentJob, setCurrentJob] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // 시작 화면을 거치지 않고 바로 들어와도 여기서 식별자가 발급되므로 그냥 진행됩니다.
    setUserId(getOrCreateUserId());
    setName(getDisplayName());
  }, []);

  // 필수 항목이 얼마나 채워졌는지 (희망직무 + 커리어목표 = 2개)
  const filledRequired = (desiredJob ? 1 : 0) + (careerGoal.trim() ? 1 : 0);
  const progress = Math.round((filledRequired / 2) * 100);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!desiredJob) {
      setError("희망직무를 선택해 주세요.");
      return;
    }
    if (!careerGoal.trim()) {
      setError("커리어 목표를 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          desired_job: desiredJob,
          career_goal: careerGoal.trim(),
          scores,
          name: name.trim(),
          department: department.trim(),
          current_job: currentJob.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "제출 중 문제가 발생했습니다.");
        return;
      }

      setDisplayName(name);
      router.push("/result");
    } catch {
      setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-navy">역량 자가진단</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          솔직하게 체크해 주세요. 나만의 성장 로드맵을 만드는 데 사용됩니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1단계: 목표 설정 */}
        <section className="gp-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-6 py-3.5">
            <h2 className="gp-section-title">
              <span className="mr-2 text-brand">1</span>어떤 방향으로 성장하고 싶으신가요?
            </h2>
            <div className="hidden items-center gap-2 sm:flex">
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-400">{progress}%</span>
            </div>
          </div>

          <div className="space-y-4 p-6">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-navy">
                희망직무 <span className="text-brand">*</span>
              </label>
              <select
                value={desiredJob}
                onChange={(e) => setDesiredJob(e.target.value)}
                className="gp-input"
              >
                <option value="">선택해 주세요</option>
                {JOB_LIST.map((job) => (
                  <option key={job} value={job}>
                    {job}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-navy">
                커리어 목표 <span className="text-brand">*</span>
              </label>
              <textarea
                value={careerGoal}
                onChange={(e) => setCareerGoal(e.target.value)}
                placeholder="예: 3년 내 마케팅 전문가로 성장해 캠페인을 직접 기획하고 싶습니다."
                rows={3}
                className="gp-input resize-none"
              />
            </div>
          </div>
        </section>

        {/* 선택 입력 */}
        <section className="gp-card overflow-hidden">
          <button
            type="button"
            onClick={() => setShowOptional((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-gray-50/70"
          >
            <span className="text-sm font-semibold text-navy">
              이름 · 부서 · 현재직무
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                선택
              </span>
            </span>
            <span className="text-xs font-semibold text-brand">
              {showOptional ? "접기 ▲" : "입력하기 ▼"}
            </span>
          </button>

          {showOptional && (
            <div className="space-y-4 border-t border-gray-100 p-6">
              <p className="rounded-lg bg-brand-50 p-3.5 text-xs leading-relaxed text-brand-800">
                넣어주시면 AI 추천이 조금 더 정확해지고, 회사 전체 통계(부서별 평균)에 반영됩니다.
                비워두셔도 진단과 추천은 그대로 이용하실 수 있습니다.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-navy">이름</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="화면에서 부를 이름"
                    className="gp-input"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-navy">부서</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="예: 영업1팀"
                    className="gp-input"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-navy">현재직무</label>
                  <input
                    type="text"
                    value={currentJob}
                    onChange={(e) => setCurrentJob(e.target.value)}
                    placeholder="예: 영업"
                    className="gp-input"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 2단계: 역량 체크 */}
        <section className="gp-card overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/70 px-6 py-3.5">
            <h2 className="gp-section-title">
              <span className="mr-2 text-brand">2</span>지금 내 역량은 어느 정도인가요?
            </h2>
          </div>

          <div className="divide-y divide-gray-100">
            {COMPETENCIES.map((c, idx) => (
              <div key={c.name} className="p-6">
                <div className="mb-3.5 flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-50 text-xs font-bold text-brand">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-navy">{c.name}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                      {c.description.replace(`${c.name} — `, "")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {scoreOptions.map((value) => {
                    const selected = scores[c.name] === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setScores((prev) => ({ ...prev, [c.name]: value }))}
                        className={`flex flex-col items-center gap-0.5 rounded-lg border px-1 py-2.5 transition ${
                          selected
                            ? "border-brand bg-brand text-white shadow-sm"
                            : "border-gray-200 bg-white text-gray-500 hover:border-brand-200 hover:bg-brand-50"
                        }`}
                      >
                        <span className="text-sm font-bold">{value}</span>
                        <span className="text-[10px] leading-tight sm:text-xs">
                          {SCORE_LABELS[value]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="gp-btn w-full py-4 text-base">
          {loading ? "제출 중..." : "제출하고 결과 보기 →"}
        </button>
      </form>
    </div>
  );
}
