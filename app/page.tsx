"use client";

/**
 * 화면1: 시작 화면
 *
 * 사번이나 아이디를 입력받지 않습니다. 버튼 하나로 바로 시작할 수 있습니다.
 * 본인 데이터 구분은 브라우저가 자동으로 발급하는 무작위 식별자로 처리합니다.
 * (lib/session.ts 참고 — 사용자는 이 과정을 알 필요가 없습니다)
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDisplayName, getExistingUserId, getOrCreateUserId, resetUser } from "@/lib/session";

export default function StartPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);
  const [displayName, setName] = useState("");

  useEffect(() => {
    const existingId = getExistingUserId();
    setName(getDisplayName());

    if (!existingId) {
      setChecked(true);
      return;
    }

    // 예전에 진단한 기록이 있는지 확인해서 "내 결과 보기" 버튼을 보여줄지 정합니다.
    fetch(`/api/diagnosis?user_id=${encodeURIComponent(existingId)}`)
      .then((res) => res.json())
      .then((data) => setHasHistory(Array.isArray(data.assessments) && data.assessments.length > 0))
      .catch(() => setHasHistory(false))
      .finally(() => setChecked(true));
  }, []);

  function start() {
    getOrCreateUserId(); // 아직 없으면 이 시점에 자동 발급됩니다.
    router.push("/diagnosis");
  }

  function handleReset() {
    resetUser();
    setHasHistory(false);
    setName("");
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-bold">그로우패스</h1>
      <p className="mb-6 text-sm text-gray-500">
        역량을 스스로 점검하고, 나에게 맞는 학습을 추천받는 곳입니다.
      </p>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        {hasHistory ? (
          <>
            <p className="mb-4 text-sm text-gray-700">
              {displayName ? `${displayName}님, 다시 오셨네요.` : "다시 오셨네요."} 지난 진단 결과가
              저장되어 있습니다.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => router.push("/result")}
                className="flex-1 rounded bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
              >
                내 결과 보기
              </button>
              <button
                onClick={start}
                className="flex-1 rounded border border-brand py-2.5 text-sm font-medium text-brand hover:bg-blue-50"
              >
                새로 진단하기
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-700">
              가입도, 사번 입력도 필요 없습니다. 바로 시작할 수 있어요.
              <br />
              10개 항목을 체크하는 데 2~3분이면 충분합니다.
            </p>
            <button
              onClick={start}
              disabled={!checked}
              className="w-full rounded bg-brand py-3 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              바로 시작하기
            </button>
          </>
        )}
      </div>

      <div className="mt-4 rounded-lg bg-gray-100 p-4 text-xs leading-relaxed text-gray-500">
        <p className="mb-1 font-medium text-gray-600">잠깐, 알아두시면 좋은 점</p>
        진단 결과는 <strong>지금 쓰고 계신 이 브라우저</strong>에 연결되어 저장됩니다. 같은 브라우저로
        다시 들어오면 이어서 볼 수 있지만, 다른 기기나 다른 브라우저에서는 새로 시작됩니다.
        {hasHistory && (
          <>
            {" "}
            <button onClick={handleReset} className="underline hover:text-gray-700">
              기록 지우고 새로 시작
            </button>
          </>
        )}
      </div>
    </div>
  );
}
