"use client";

/**
 * 화면7: 설정 (Gemini API 키)
 * - 개인 API 키(선택): 이 브라우저에만 저장되며, 있으면 AI 추천에 공용 키 대신 사용됩니다.
 * - 공용 API 키(관리자 전용): 관리자 코드를 입력해야 저장/삭제할 수 있고, 전 직원이 함께 사용합니다.
 */
import { useEffect, useState } from "react";
import {
  clearPersonalGeminiKey,
  getPersonalGeminiKey,
  setPersonalGeminiKey,
} from "@/lib/personalKey";

type TestState = "idle" | "testing" | "success" | "fail";

async function testKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/settings/test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey }),
    });
    return await res.json();
  } catch {
    return { ok: false, error: "서버에 연결할 수 없습니다." };
  }
}

export default function SettingsPage() {
  // 개인 키 영역
  const [personalKey, setPersonalKeyInput] = useState("");
  const [hasPersonalKey, setHasPersonalKey] = useState(false);
  const [personalTest, setPersonalTest] = useState<TestState>("idle");
  const [personalError, setPersonalError] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");

  // 공용 키(관리자) 영역
  const [adminCode, setAdminCode] = useState("");
  const [sharedKey, setSharedKeyInput] = useState("");
  const [sharedConfigured, setSharedConfigured] = useState<boolean | null>(null);
  const [sharedTest, setSharedTest] = useState<TestState>("idle");
  const [sharedError, setSharedError] = useState("");
  const [sharedMessage, setSharedMessage] = useState("");

  useEffect(() => {
    const existing = getPersonalGeminiKey();
    setHasPersonalKey(!!existing);
    if (existing) setPersonalKeyInput(existing);

    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => setSharedConfigured(!!data.configured))
      .catch(() => setSharedConfigured(null));
  }, []);

  async function handlePersonalTest() {
    setPersonalError("");
    setPersonalMessage("");
    if (!personalKey.trim()) {
      setPersonalError("API 키를 입력해 주세요.");
      return;
    }
    setPersonalTest("testing");
    const result = await testKey(personalKey.trim());
    setPersonalTest(result.ok ? "success" : "fail");
    if (!result.ok) setPersonalError(result.error || "연결에 실패했습니다.");
  }

  function handlePersonalSave() {
    setPersonalGeminiKey(personalKey.trim());
    setHasPersonalKey(!!personalKey.trim());
    setPersonalMessage("이 브라우저에 저장했습니다.");
  }

  function handlePersonalClear() {
    clearPersonalGeminiKey();
    setPersonalKeyInput("");
    setHasPersonalKey(false);
    setPersonalTest("idle");
    setPersonalMessage("개인 키를 삭제했습니다. 이제부터는 공용 키를 사용합니다.");
  }

  async function handleSharedTest() {
    setSharedError("");
    setSharedMessage("");
    if (!sharedKey.trim()) {
      setSharedError("API 키를 입력해 주세요.");
      return;
    }
    setSharedTest("testing");
    const result = await testKey(sharedKey.trim());
    setSharedTest(result.ok ? "success" : "fail");
    if (!result.ok) setSharedError(result.error || "연결에 실패했습니다.");
  }

  async function handleSharedSave() {
    setSharedError("");
    setSharedMessage("");
    if (!adminCode.trim()) {
      setSharedError("관리자 코드를 입력해 주세요.");
      return;
    }
    if (!sharedKey.trim()) {
      setSharedError("API 키를 입력해 주세요.");
      return;
    }
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_code: adminCode.trim(), api_key: sharedKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSharedError(data.error || "저장 중 문제가 발생했습니다.");
        return;
      }
      setSharedConfigured(true);
      setSharedMessage("공용 키를 저장했습니다. 전 직원이 함께 사용합니다.");
    } catch {
      setSharedError("서버에 연결할 수 없습니다.");
    }
  }

  async function handleSharedDelete() {
    setSharedError("");
    setSharedMessage("");
    if (!adminCode.trim()) {
      setSharedError("관리자 코드를 입력해 주세요.");
      return;
    }
    try {
      const res = await fetch("/api/settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_code: adminCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSharedError(data.error || "삭제 중 문제가 발생했습니다.");
        return;
      }
      setSharedConfigured(false);
      setSharedMessage("공용 키를 삭제했습니다.");
    } catch {
      setSharedError("서버에 연결할 수 없습니다.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="mb-1 text-xl font-bold">설정</h1>
        <p className="text-sm text-gray-500">
          AI 맞춤 추천(화면4)에 사용할 Gemini API 키를 관리합니다.
        </p>
      </div>

      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-bold">개인 API 키 (선택)</h2>
        <p className="mb-3 text-xs text-gray-500">
          이 브라우저에만 저장되며 서버에는 저장되지 않습니다. 입력해두면 공용 키 대신 내
          키로 AI 추천을 받습니다. {hasPersonalKey && <span className="text-brand">· 현재 저장됨</span>}
        </p>
        <input
          type="password"
          value={personalKey}
          onChange={(e) => {
            setPersonalKeyInput(e.target.value);
            setPersonalTest("idle");
          }}
          placeholder="AIza로 시작하는 Gemini API 키"
          className="w-full rounded border px-3 py-2 text-sm"
        />
        {personalError && <p className="mt-2 text-sm text-red-600">{personalError}</p>}
        {personalTest === "success" && (
          <p className="mt-2 text-sm text-green-600">연결에 성공했습니다.</p>
        )}
        {personalMessage && <p className="mt-2 text-sm text-gray-600">{personalMessage}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={handlePersonalTest}
            disabled={personalTest === "testing"}
            className="rounded border border-brand px-3 py-1.5 text-xs font-medium text-brand hover:bg-blue-50 disabled:opacity-50"
          >
            {personalTest === "testing" ? "확인 중..." : "연결 테스트"}
          </button>
          <button
            onClick={handlePersonalSave}
            className="rounded bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
          >
            저장
          </button>
          {hasPersonalKey && (
            <button
              onClick={handlePersonalClear}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              삭제
            </button>
          )}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-bold">공용 API 키 (관리자 전용)</h2>
        <p className="mb-3 text-xs text-gray-500">
          개인 키가 없는 직원은 이 공용 키로 AI 추천을 받습니다. 현재 상태:{" "}
          {sharedConfigured === null
            ? "확인 중..."
            : sharedConfigured
            ? "설정되어 있음"
            : "설정되어 있지 않음"}
        </p>
        <div className="space-y-2">
          <input
            type="password"
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            placeholder="관리자 코드"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={sharedKey}
            onChange={(e) => {
              setSharedKeyInput(e.target.value);
              setSharedTest("idle");
            }}
            placeholder="새로 저장할 Gemini API 키"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        {sharedError && <p className="mt-2 text-sm text-red-600">{sharedError}</p>}
        {sharedTest === "success" && (
          <p className="mt-2 text-sm text-green-600">연결에 성공했습니다.</p>
        )}
        {sharedMessage && <p className="mt-2 text-sm text-gray-600">{sharedMessage}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={handleSharedTest}
            disabled={sharedTest === "testing"}
            className="rounded border border-brand px-3 py-1.5 text-xs font-medium text-brand hover:bg-blue-50 disabled:opacity-50"
          >
            {sharedTest === "testing" ? "확인 중..." : "연결 테스트"}
          </button>
          <button
            onClick={handleSharedSave}
            className="rounded bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
          >
            저장
          </button>
          <button
            onClick={handleSharedDelete}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            삭제
          </button>
        </div>
      </section>
    </div>
  );
}
