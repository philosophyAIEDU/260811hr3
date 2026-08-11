/**
 * "지금 이 화면을 보고 있는 사람이 누구인지"를 구분하기 위한 파일입니다.
 *
 * 사번이나 아이디를 입력받지 않습니다. 대신 이 브라우저에 **무작위 식별자**를 하나 만들어
 * 저장해두고, 그것으로 본인 데이터를 찾습니다. 사용자는 아무것도 입력하지 않아도 됩니다.
 *
 * 왜 이 방식이 사번보다 안전한가:
 * 사번은 규칙이 있어 남이 추측할 수 있지만(E2024001 다음은 E2024002…),
 * 여기서 만드는 식별자는 무작위라 추측이 불가능합니다.
 *
 * 저장 위치는 localStorage입니다. 브라우저를 닫았다 열어도 유지되므로
 * "내 결과 보기"로 예전 진단 결과를 다시 볼 수 있습니다.
 * (단, 다른 기기나 다른 브라우저에서는 다른 사람으로 인식됩니다 — 로그인이 없기 때문입니다)
 */

const USER_ID_KEY = "gp_user_id";
const DISPLAY_NAME_KEY = "gp_display_name";

/** 추측할 수 없는 무작위 식별자를 만듭니다. */
function createUserId(): string {
  // 최신 브라우저에는 안전한 난수 생성기가 내장되어 있습니다.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // 아주 오래된 브라우저를 위한 마지막 대비책입니다.
  return `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * 이 브라우저의 식별자를 돌려줍니다. 없으면 그 자리에서 새로 만들어 저장합니다.
 * 따라서 사용자는 첫 방문에도 아무 입력 없이 바로 시작할 수 있습니다.
 */
export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "";

  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = createUserId();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

/** 이미 발급된 식별자만 확인합니다. (없으면 null — 새로 만들지 않음) */
export function getExistingUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_ID_KEY);
}

/** 화면에 "OO님" 하고 부르기 위한 이름입니다. 선택 입력이라 비어 있을 수 있습니다. */
export function getDisplayName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(DISPLAY_NAME_KEY) ?? "";
}

export function setDisplayName(name: string) {
  if (typeof window === "undefined") return;
  if (name.trim()) {
    localStorage.setItem(DISPLAY_NAME_KEY, name.trim());
  } else {
    localStorage.removeItem(DISPLAY_NAME_KEY);
  }
}

/** 이 브라우저의 기록을 지우고 완전히 새 사람으로 시작합니다. */
export function resetUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(DISPLAY_NAME_KEY);
}
