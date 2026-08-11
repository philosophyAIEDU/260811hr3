/**
 * 앱 전역에서 쓰는 고정 설정값을 모아둔 파일입니다.
 * Gemini 모델명이 바뀌면 이 파일의 GEMINI_MODEL 한 줄만 고치면 됩니다.
 */

/** 사용할 Gemini 모델명 (여기 한 곳만 바꾸면 전체 앱에 반영됩니다) */
export const GEMINI_MODEL = "gemini-3.5-flash-lite";

/**
 * HR 관리자 화면(/admin) 입장 코드입니다.
 * 기본값은 1234입니다. Netlify에 배포한 뒤 바꾸고 싶으면 코드를 고칠 필요 없이
 * Netlify 사이트 설정(Site configuration → Environment variables)에서
 * ADMIN_CODE 값을 새로 등록하면 됩니다. (등록 후 재배포하면 반영됩니다)
 */
export const ADMIN_CODE = process.env.ADMIN_CODE || "1234";

/** 역량 점수 척도 범위 (1=거의 못함 ~ 5=매우 잘함) */
export const SCORE_MIN = 1;
export const SCORE_MAX = 5;

/** 이 값 이상 차이나면 "우선 보완" 대상으로 표시 (요구수준 - 현재점수) */
export const GAP_ALERT_THRESHOLD = 2;

/** 완료 항목이 이 개수 이상 쌓이면 재진단 안내 배너를 띄움 */
export const RECOMMEND_COMPLETE_BANNER_THRESHOLD = 3;

/** 성장 로드맵 단계 목록 */
export const ROADMAP_STAGES = ["3개월", "6개월", "12개월"] as const;

/** 추천결과 "구분" 값 */
export const RECOMMENDATION_CATEGORIES = ["사내강의", "외부주제", "도서"] as const;

/** 추천결과 "상태" 값 */
export const LEARNING_STATUSES = ["예정", "수강중", "완료"] as const;

/** 휴넷 메인 주소 (실제 검색 주소 형식을 확인하기 전까지는 이 주소로 연결) */
export const HUNET_HOME_URL = "https://www.hunet.co.kr";

/** 관리자가 저장하는 공용 Gemini API 키의 app_settings 테이블 key 값 */
export const SHARED_GEMINI_KEY_SETTING = "shared_gemini_api_key";

/** 개인 Gemini API 키를 브라우저(localStorage)에 저장할 때 쓰는 키 이름 (서버에는 저장하지 않음) */
export const PERSONAL_GEMINI_KEY_STORAGE = "gp_personal_gemini_key";
