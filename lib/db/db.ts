/**
 * Netlify DB(Neon Postgres) 연결과 초기화를 담당하는 파일입니다.
 * 모든 API 코드는 이 파일의 getSql()을 통해서만 데이터베이스에 접근합니다.
 *
 * 테이블 구조는 lib/db/schema.sql 문서와 반드시 같은 내용을 유지해야 합니다.
 * (Netlify 서버리스 함수 안에서는 파일을 직접 읽어 실행하기보다,
 *  아래처럼 SQL 문을 코드에 직접 넣어 실행하는 방식이 더 안전합니다)
 */
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let cachedSql: NeonQueryFunction<false, false> | null = null;
let schemaReady = false;

/** Netlify DB 연결 문자열을 찾아 Neon 클라이언트를 만듭니다. */
export function getSql(): NeonQueryFunction<false, false> {
  if (cachedSql) return cachedSql;

  const url = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    // 이 오류는 개발자용 로그에만 남고, 화면에는 한국어 안내 문구로 바뀌어 나갑니다.
    throw new Error(
      "DB_NOT_CONFIGURED: NETLIFY_DATABASE_URL 환경변수가 없습니다. Netlify에서 DB 연결을 먼저 해주세요."
    );
  }
  cachedSql = neon(url);
  return cachedSql;
}

/**
 * 테이블이 없으면 만들어 줍니다. (IF NOT EXISTS 이므로 여러 번 실행해도 안전)
 * 서버리스 함수가 새로 뜰 때(콜드 스타트) 한 번만 실행되도록 schemaReady로 캐시합니다.
 * lib/db/schema.sql과 반드시 같은 내용으로 유지해 주세요.
 */
export async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  const sql = getSql();

  await sql(`
    CREATE TABLE IF NOT EXISTS employees (
      employee_id   TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      department    TEXT NOT NULL,
      current_job   TEXT NOT NULL,
      position      TEXT,
      created_at    TEXT NOT NULL
    )
  `);

  await sql(`
    CREATE TABLE IF NOT EXISTS assessments (
      assessment_id   SERIAL PRIMARY KEY,
      employee_id     TEXT NOT NULL REFERENCES employees(employee_id),
      assessed_at     TEXT NOT NULL,
      desired_job     TEXT NOT NULL,
      career_goal     TEXT NOT NULL
    )
  `);

  await sql(`
    CREATE TABLE IF NOT EXISTS competency_scores (
      assessment_id   INTEGER NOT NULL REFERENCES assessments(assessment_id),
      competency_name TEXT NOT NULL,
      current_score   INTEGER NOT NULL,
      required_level  INTEGER NOT NULL,
      PRIMARY KEY (assessment_id, competency_name)
    )
  `);

  await sql(`
    CREATE TABLE IF NOT EXISTS recommendations (
      recommendation_id  SERIAL PRIMARY KEY,
      assessment_id       INTEGER NOT NULL REFERENCES assessments(assessment_id),
      category             TEXT NOT NULL,
      title                 TEXT NOT NULL,
      search_keyword        TEXT,
      platform              TEXT,
      reason                TEXT NOT NULL,
      stage                 TEXT NOT NULL,
      status                TEXT NOT NULL DEFAULT '예정',
      completed_at          TEXT
    )
  `);

  await sql(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key    TEXT PRIMARY KEY,
      value  TEXT NOT NULL
    )
  `);

  schemaReady = true;
}
