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
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">설정</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          AI 맞춤 추천에 사용할 Gemini API 키를 관리합니다.
        </p>
      </div>

      {/* 개인 키 */}
      <section className="gp-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-6 py-3.5">
          <div>
            <h2 className="gp-section-title">개인 API 키</h2>
            <p className="mt-0.5 text-xs text-gray-400">이 브라우저에만 저장됩니다</p>
          </div>
          {hasPersonalKey && (
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
              저장됨
            </span>
          )}
        </div>

        <div className="p-6">
          <p className="mb-4 rounded-lg bg-gray-50 p-3.5 text-xs leading-relaxed text-gray-500">
            서버에는 저장되지 않습니다. 입력해두면 공용 키 대신 내 키로 AI 추천을 받습니다.
            <br />
            키 발급: Google AI Studio (aistudio.google.com/apikey)
          </p>

          <input
            type="password"
            value={personalKey}
            onChange={(e) => {
              setPersonalKeyInput(e.target.value);
              setPersonalTest("idle");
            }}
            placeholder="AIza로 시작하는 Gemini API 키"
            className="gp-input"
          />

          {personalError && <p className="mt-2.5 text-sm text-red-600">{personalError}</p>}
          {personalTest === "success" && (
            <p className="mt-2.5 text-sm font-medium text-brand">✓ 연결에 성공했습니다.</p>
          )}
          {personalMessage && <p className="mt-2.5 text-sm text-gray-500">{personalMessage}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handlePersonalTest}
              disabled={personalTest === "testing"}
              className="gp-btn-ghost"
            >
              {personalTest === "testing" ? "확인 중..." : "연결 테스트"}
            </button>
            <button
              onClick={handlePersonalSave}
              className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-600"
            >
              저장
            </button>
            {hasPersonalKey && (
              <button onClick={handlePersonalClear} className="gp-btn-ghost">
                삭제
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 공용 키 */}
      <section className="gp-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-6 py-3.5">
          <div>
            <h2 className="gp-section-title">공용 API 키</h2>
            <p className="mt-0.5 text-xs text-gray-400">관리자 전용 · 전 직원이 함께 사용</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              sharedConfigured === null
                ? "bg-gray-100 text-gray-400"
                : sharedConfigured
                ? "bg-brand-50 text-brand-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {sharedConfigured === null ? "확인 중" : sharedConfigured ? "설정됨" : "미설정"}
          </span>
        </div>

        <div className="space-y-3 p-6">
          <p className="rounded-lg bg-gray-50 p-3.5 text-xs leading-relaxed text-gray-500">
            개인 키가 없는 직원은 이 공용 키로 AI 추천을 받습니다. 보안을 위해 저장된 키 값은
            화면에 다시 표시되지 않고, 설정 여부만 보여드립니다.
          </p>

          <input
            type="password"
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            placeholder="관리자 코드"
            className="gp-input"
          />
          <input
            type="password"
            value={sharedKey}
            onChange={(e) => {
              setSharedKeyInput(e.target.value);
              setSharedTest("idle");
            }}
            placeholder="새로 저장할 Gemini API 키"
            className="gp-input"
          />

          {sharedError && <p className="text-sm text-red-600">{sharedError}</p>}
          {sharedTest === "success" && (
            <p className="text-sm font-medium text-brand">✓ 연결에 성공했습니다.</p>
          )}
          {sharedMessage && <p className="text-sm text-gray-500">{sharedMessage}</p>}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleSharedTest}
              disabled={sharedTest === "testing"}
              className="gp-btn-ghost"
            >
              {sharedTest === "testing" ? "확인 중..." : "연결 테스트"}
            </button>
            <button
              onClick={handleSharedSave}
              className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-600"
            >
              저장
            </button>
            <button onClick={handleSharedDelete} className="gp-btn-ghost">
              삭제
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
