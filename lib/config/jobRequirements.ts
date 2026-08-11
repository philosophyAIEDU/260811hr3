/**
 * 희망직무별 역량 요구수준(1~5) 표입니다.
 * HR 담당자가 나중에 값을 바꾸거나 직무를 추가/삭제하고 싶을 때는
 * 이 파일 하나만 수정하면 됩니다. (코드 다른 곳은 손댈 필요 없음)
 *
 * 값을 바꾸는 방법: 아래 숫자(1~5)만 원하는 값으로 고치면 됩니다.
 * 직무를 새로 추가하는 방법: JOB_REQUIREMENTS 객체 안에 같은 형식으로
 *   "새직무명": { 문제해결: 3, 데이터분석: 3, ... } 를 추가하고,
 *   JOB_LIST 배열에도 "새직무명"을 추가하면 됩니다.
 *
 * 역량명은 반드시 competencies.ts의 COMPETENCY_NAMES와 철자가 같아야 합니다.
 */

import { COMPETENCY_NAMES } from "./competencies";

export type JobRequirementTable = Record<string, number>;

/** 희망직무 목록 (최소 5개 요구사항 충족: 영업, 마케팅, 기획, 인사, IT) */
export const JOB_LIST: string[] = ["영업", "마케팅", "기획", "인사", "IT"];

/** 직무별 · 역량별 요구수준(1~5) 표 */
export const JOB_REQUIREMENTS: Record<string, JobRequirementTable> = {
  영업: {
    문제해결: 3,
    데이터분석: 2,
    커뮤니케이션: 5,
    리더십: 3,
    기획력: 2,
    디지털도구활용: 2,
    협업: 4,
    고객이해: 5,
    재무이해: 2,
    자기주도학습: 3,
  },
  마케팅: {
    문제해결: 4,
    데이터분석: 4,
    커뮤니케이션: 4,
    리더십: 2,
    기획력: 5,
    디지털도구활용: 4,
    협업: 3,
    고객이해: 5,
    재무이해: 2,
    자기주도학습: 4,
  },
  기획: {
    문제해결: 5,
    데이터분석: 4,
    커뮤니케이션: 4,
    리더십: 3,
    기획력: 5,
    디지털도구활용: 3,
    협업: 4,
    고객이해: 3,
    재무이해: 4,
    자기주도학습: 4,
  },
  인사: {
    문제해결: 3,
    데이터분석: 2,
    커뮤니케이션: 5,
    리더십: 4,
    기획력: 3,
    디지털도구활용: 2,
    협업: 5,
    고객이해: 3,
    재무이해: 2,
    자기주도학습: 3,
  },
  IT: {
    문제해결: 5,
    데이터분석: 4,
    커뮤니케이션: 3,
    리더십: 2,
    기획력: 3,
    디지털도구활용: 5,
    협업: 4,
    고객이해: 2,
    재무이해: 1,
    자기주도학습: 5,
  },
};

/**
 * 표의 형식이 깨지지 않았는지(직무마다 역량 10개가 모두 1~5로 들어있는지)
 * 앱 시작 시 확인하기 위한 검증 함수입니다.
 */
export function validateJobRequirements(): string[] {
  const errors: string[] = [];
  for (const job of JOB_LIST) {
    const table = JOB_REQUIREMENTS[job];
    if (!table) {
      errors.push(`"${job}" 직무의 요구수준 표가 없습니다.`);
      continue;
    }
    for (const name of COMPETENCY_NAMES) {
      const level = table[name];
      if (level === undefined) {
        errors.push(`"${job}" 직무에 "${name}" 역량의 요구수준이 없습니다.`);
      } else if (level < 1 || level > 5) {
        errors.push(`"${job}" 직무의 "${name}" 요구수준(${level})이 1~5 범위를 벗어났습니다.`);
      }
    }
  }
  return errors;
}
