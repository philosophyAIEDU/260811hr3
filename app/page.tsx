"use client";

/**
 * 화면1: 시작 화면
 * 사번과 이름을 입력해 본인 데이터에 접근합니다. (아이디/비밀번호 없음)
 * 처음 보는 사번이면 부서·직무·직급 입력칸이 추가로 나타나 등록까지 함께 진행합니다.
 * 기존 사번이면 "진단 시작"과 "내 결과 보기" 버튼이 함께 나타납니다.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { setSessionEmployee } from "@/lib/session";

type Step = "form" | "existing" | "new";

export default function StartPage() {
  const router = useRouter();

  const [employeeId, setEmployeeId] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 신규 등록용 추가 입력값
  const [department, setDepartment] = useState("");
  const [currentJob, setCurrentJob] = useState("");
  const [position, setPosition] = useState("");

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!employeeId.trim() || !name.trim()) {
      setError("사번과 이름을 모두 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        employee_id: employeeId.trim(),
        name: name.trim(),
      });
      const res = await fetch(`/api/employee?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "확인 중 문제가 발생했습니다.");
        return;
      }

      if (data.found) {
        setStep("existing");
      } else {
        setStep("new");
      }
    } catch {
      setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!department.trim() || !currentJob.trim()) {
      setError("부서와 현재직무는 필수 입력 항목입니다.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId.trim(),
          name: name.trim(),
          department: department.trim(),
          current_job: currentJob.trim(),
          position: position.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "등록 중 문제가 발생했습니다.");
        return;
      }

      goToDiagnosis();
    } catch {
      setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  function goToDiagnosis() {
    setSessionEmployee({ employee_id: employeeId.trim(), name: name.trim() });
    router.push("/diagnosis");
  }

  function goToResult() {
    setSessionEmployee({ employee_id: employeeId.trim(), name: name.trim() });
    router.push("/result");
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-xl font-bold">그로우패스 시작하기</h1>
      <p className="mb-6 text-sm text-gray-500">
        사번과 이름을 입력하면 본인의 진단 결과와 추천 학습을 확인할 수 있습니다.
      </p>

      <form onSubmit={handleCheck} className="space-y-3 rounded-lg border bg-white p-5 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium">사번</label>
          <input
            type="text"
            value={employeeId}
            onChange={(e) => {
              setEmployeeId(e.target.value);
              setStep("form");
            }}
            placeholder="예: E2024001"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">이름</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setStep("form");
            }}
            placeholder="예: 김하늘"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {step === "form" && (
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-brand py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {loading ? "확인 중..." : "확인"}
          </button>
        )}
      </form>

      {step === "existing" && (
        <div className="mt-4 space-y-2 rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-700">
            <strong>{name}</strong>님, 반갑습니다. 이미 등록된 사번입니다.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={goToDiagnosis}
              className="flex-1 rounded bg-brand py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              새로 진단 시작
            </button>
            <button
              onClick={goToResult}
              className="flex-1 rounded border border-brand py-2 text-sm font-medium text-brand hover:bg-blue-50"
            >
              내 결과 보기
            </button>
          </div>
        </div>
      )}

      {step === "new" && (
        <form
          onSubmit={handleRegister}
          className="mt-4 space-y-3 rounded-lg border bg-white p-5 shadow-sm"
        >
          <p className="text-sm text-gray-700">
            처음 확인되는 사번입니다. 아래 정보를 입력하고 등록해 주세요.
          </p>
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
          <div>
            <label className="mb-1 block text-sm font-medium">직급 (선택)</label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="예: 대리"
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-brand py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {loading ? "등록 중..." : "등록하고 진단 시작"}
          </button>
        </form>
      )}
    </div>
  );
}
