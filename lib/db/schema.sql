-- 그로우패스 데이터베이스 테이블 정의 (Netlify DB / Neon Postgres용)
-- 이 파일은 Netlify DB(Neon Postgres)에 처음 접속했을 때 실행되는 테이블 구조입니다.
-- (원래는 로컬 SQLite로 설계했으나, Netlify 배포 결정에 따라 Postgres 문법으로 변경했습니다.
--  IF NOT EXISTS를 써서 여러 번 실행해도 안전합니다 — 앱 시작 시 자동으로 실행됩니다.)
-- 요청서 "4. 데이터 구조"에 정의된 4개 표(직원/진단회차/역량점수/추천결과)를 그대로 반영합니다.

-- 직원 테이블: 사번으로 본인 데이터를 구분합니다. (아이디/비밀번호 없음)
CREATE TABLE IF NOT EXISTS employees (
  employee_id   TEXT PRIMARY KEY,           -- 사번 (예: E2024001)
  name          TEXT NOT NULL,              -- 이름
  department    TEXT NOT NULL,              -- 부서
  current_job   TEXT NOT NULL,              -- 현재직무
  position      TEXT,                       -- 직급 (선택 입력)
  created_at    TEXT NOT NULL               -- 등록일 (YYYY-MM-DD)
);

-- 진단회차 테이블: 같은 사번이 여러 번 진단하면 행이 여러 개 쌓입니다. (이력 비교용)
CREATE TABLE IF NOT EXISTS assessments (
  assessment_id   SERIAL PRIMARY KEY,                   -- 진단번호 (자동증가)
  employee_id     TEXT NOT NULL REFERENCES employees(employee_id), -- 사번
  assessed_at     TEXT NOT NULL,                        -- 진단일시 (YYYY-MM-DD HH:MM)
  desired_job     TEXT NOT NULL,                        -- 희망직무
  career_goal     TEXT NOT NULL                         -- 커리어목표 (긴 문자)
);

-- 역량점수 테이블: 진단 1회당 역량 10개 점수가 10행씩 쌓입니다.
CREATE TABLE IF NOT EXISTS competency_scores (
  assessment_id   INTEGER NOT NULL REFERENCES assessments(assessment_id), -- 진단번호
  competency_name TEXT NOT NULL,      -- 역량명 (competencies.ts의 10개 중 하나)
  current_score   INTEGER NOT NULL,   -- 현재점수 (1~5)
  required_level  INTEGER NOT NULL,   -- 요구수준 (1~5, 희망직무 기준)
  PRIMARY KEY (assessment_id, competency_name)
);

-- 추천결과 테이블: AI가 만든 추천 항목과 학습 진행 상태를 저장합니다.
CREATE TABLE IF NOT EXISTS recommendations (
  recommendation_id  SERIAL PRIMARY KEY,                -- 추천번호 (자동증가)
  assessment_id       INTEGER NOT NULL REFERENCES assessments(assessment_id), -- 진단번호
  category             TEXT NOT NULL,                    -- 구분: 사내강의 / 외부주제 / 도서
  title                 TEXT NOT NULL,                    -- 제목 (학습 주제 또는 도서명)
  search_keyword        TEXT,                             -- 검색키워드 (휴넷/외부 플랫폼 검색용)
  platform              TEXT,                             -- 플랫폼 (휴넷 / 인프런 / 유데미 / 코세라 등)
  reason                TEXT NOT NULL,                    -- 추천이유
  stage                 TEXT NOT NULL,                    -- 단계: 3개월 / 6개월 / 12개월
  status                TEXT NOT NULL DEFAULT '예정',     -- 상태: 예정 / 수강중 / 완료
  completed_at          TEXT                              -- 완료일 (완료로 바뀔 때 자동 기록)
);

-- 설정 테이블: Gemini API 키(관리자 공용) 등 앱 전역 설정을 저장합니다.
-- key 예시: 'shared_gemini_api_key' (관리자가 저장한 공용 키)
CREATE TABLE IF NOT EXISTS app_settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);
