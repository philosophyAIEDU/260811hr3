/**
 * 로그인 기능이 없기 때문에, "지금 화면을 보고 있는 사람이 누구인지"를
 * 화면과 화면 사이에서 전달하기 위한 임시 저장소입니다.
 * 브라우저 탭(세션) 안에서만 유지되고, 탭을 닫으면 사라지며 서버에는 저장되지 않습니다.
 */

export interface SessionEmployee {
  employee_id: string;
  name: string;
}

const KEY = "gp_employee";

export function setSessionEmployee(emp: SessionEmployee) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(emp));
}

export function getSessionEmployee(): SessionEmployee | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionEmployee;
  } catch {
    return null;
  }
}

export function clearSessionEmployee() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}
