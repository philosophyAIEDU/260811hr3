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
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold">역량 자가진단</h1>
      <p className="mb-6 text-sm text-gray-500">
        아래 항목을 솔직하게 체크해 주세요. 나만의 성장 로드맵을 만드는 데 사용됩니다.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <label className="mb-1 block text-sm font-medium">
            희망직무 <span className="text-red-500">*</span>
          </label>
          <select
            value={desiredJob}
            onChange={(e) => setDesiredJob(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="">선택해 주세요</option>
            {JOB_LIST.map((job) => (
              <option key={job} value={job}>
                {job}
              </option>
            ))}
          </select>

          <label className="mb-1 mt-4 block text-sm font-medium">
            커리어 목표 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={careerGoal}
            onChange={(e) => setCareerGoal(e.target.value)}
            placeholder="예: 3년 내 마케팅 전문가로 성장해 캠페인을 직접 기획하고 싶습니다."
            rows={3}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <button
            type="button"
            onClick={() => setShowOptional((v) => !v)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-sm font-medium">
              이름 · 부서 · 현재직무 <span className="text-gray-400">(선택, 안 쓰셔도 됩니다)</span>
            </span>
            <span className="text-xs text-brand">{showOptional ? "접기" : "입력하기"}</span>
          </button>

          {showOptional && (
            <div className="mt-4 space-y-3">
              <p className="rounded bg-gray-50 p-3 text-xs text-gray-500">
                넣어주시면 AI 추천이 조금 더 정확해지고, 회사 전체 통계(부서별 평균)에 반영됩니다.
                비워두셔도 진단과 추천은 그대로 이용하실 수 있습니다.
              </p>
              <div>
                <label className="mb-1 block text-sm font-medium">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="화면에서 부를 이름"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">부서</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="예: 영업1팀"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">현재직무</label>
                <input
                  type="text"
                  value={currentJob}
                  onChange={(e) => setCurrentJob(e.target.value)}
                  placeholder="예: 영업"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {COMPETENCIES.map((c) => (
            <div key={c.name} className="rounded-lg border bg-white p-5 shadow-sm">
              <p className="mb-3 text-sm font-medium">{c.description}</p>
              <div className="flex flex-wrap gap-2">
                {scoreOptions.map((value) => {
                  const selected = scores[c.name] === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setScores((prev) => ({ ...prev, [c.name]: value }))}
                      className={`flex flex-col items-center rounded border px-3 py-1.5 text-xs ${
                        selected
                          ? "border-brand bg-brand text-white"
                          : "border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-sm font-semibold">{value}</span>
                      <span>{SCORE_LABELS[value]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-brand py-3 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {loading ? "제출 중..." : "제출하고 결과 보기"}
        </button>
      </form>
    </div>
  );
}
