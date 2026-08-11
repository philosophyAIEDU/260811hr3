/**
 * 역량 자가진단에 사용하는 역량 10개 고정 목록입니다.
 * 진단 설문(화면2)과 결과 화면(화면3)에서 이 목록을 그대로 사용합니다.
 * 역량 이름이나 설명을 바꾸고 싶으면 이 파일만 수정하면 됩니다.
 */

export interface Competency {
  /** 역량명 - 역량점수 테이블의 "역량명"과 반드시 동일해야 합니다 */
  name: string;
  /** 진단 화면에 표시할 한 줄 설명 */
  description: string;
}

export const COMPETENCIES: Competency[] = [
  { name: "문제해결", description: "문제해결 — 상황을 분석해 원인을 찾고 해결 방안을 제시할 수 있다" },
  { name: "데이터분석", description: "데이터분석 — 숫자와 자료를 근거로 판단할 수 있다" },
  { name: "커뮤니케이션", description: "커뮤니케이션 — 생각을 명확히 전달하고 상대의 말을 정확히 이해할 수 있다" },
  { name: "리더십", description: "리더십 — 목표를 향해 다른 사람들을 이끌고 동기를 부여할 수 있다" },
  { name: "기획력", description: "기획력 — 목표에 맞는 계획을 논리적으로 세울 수 있다" },
  { name: "디지털도구활용", description: "디지털도구활용 — 업무에 필요한 소프트웨어·디지털 도구를 능숙하게 활용할 수 있다" },
  { name: "협업", description: "협업 — 다른 부서·동료와 원활하게 협력해 성과를 낼 수 있다" },
  { name: "고객이해", description: "고객이해 — 고객(내부·외부)의 니즈를 파악하고 반영할 수 있다" },
  { name: "재무이해", description: "재무이해 — 비용·매출 등 숫자로 표현된 경영 정보를 이해할 수 있다" },
  { name: "자기주도학습", description: "자기주도학습 — 스스로 부족한 점을 찾아 학습 계획을 세우고 실행할 수 있다" },
];

/** 역량명만 뽑은 배열 (검증, 반복문 등에 사용) */
export const COMPETENCY_NAMES: string[] = COMPETENCIES.map((c) => c.name);
