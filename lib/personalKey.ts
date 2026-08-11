/**
 * 개인 Gemini API 키를 저장하는 곳입니다.
 * 서버(DB)에는 절대 저장하지 않고, 이 브라우저(localStorage)에만 남습니다.
 * (개인마다 로그인이 없기 때문에, 서버에 저장하면 관리·유출 위험이 커집니다)
 */
import { PERSONAL_GEMINI_KEY_STORAGE } from "@/lib/config/constants";

export function getPersonalGeminiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(PERSONAL_GEMINI_KEY_STORAGE) ?? "";
}

export function setPersonalGeminiKey(key: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PERSONAL_GEMINI_KEY_STORAGE, key);
}

export function clearPersonalGeminiKey() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PERSONAL_GEMINI_KEY_STORAGE);
}
