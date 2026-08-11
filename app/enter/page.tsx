"use client";

/**
 * 사이트 진입 코드 입력 화면입니다. (요청서 원안에는 없던 화면)
 * Netlify 배포로 사이트가 인터넷에 공개되므로, 접속코드를 모르는 사람은
 * 그 어떤 화면도 볼 수 없도록 가장 먼저 이 화면을 통과해야 합니다.
 */
import { useState, Suspense, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function EnterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/site-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "접속코드가 올바르지 않습니다.");
        return;
      }

      const next = searchParams.get("next") || "/";
      router.replace(next);
      router.refresh();
    } catch {
      setError("접속 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-lg border bg-white p-6 shadow-sm">
      <h1 className="mb-2 text-lg font-bold">그로우패스 접속</h1>
      <p className="mb-4 text-sm text-gray-500">
        사내 전용 서비스입니다. 회사에서 안내받은 접속코드를 입력해 주세요.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="접속코드"
          className="w-full rounded border px-3 py-2 text-sm"
          autoFocus
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-brand py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {loading ? "확인 중..." : "접속하기"}
        </button>
      </form>
    </div>
  );
}

export default function EnterPage() {
  return (
    <Suspense fallback={null}>
      <EnterForm />
    </Suspense>
  );
}
