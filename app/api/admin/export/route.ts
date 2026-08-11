/**
 * 화면6(HR 관리자)의 "엑셀 다운로드" 버튼에서 사용하는 API입니다.
 * 시트1: 직원별 최신 진단 요약 (역량 10개 현재점수 포함)
 * 시트2: 추천 및 학습 현황 (전체 직원의 추천 항목 + 진행 상태)
 */
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { ensureSchema, getSql } from "@/lib/db/db";
import { ADMIN_CODE } from "@/lib/config/constants";
import { COMPETENCY_NAMES } from "@/lib/config/competencies";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const adminCode = String(body.admin_code ?? "");
  if (adminCode !== ADMIN_CODE) {
    return NextResponse.json({ error: "관리자 코드가 올바르지 않습니다." }, { status: 401 });
  }

  try {
    await ensureSchema();
    const sql = getSql();

    const employees = await sql`
      SELECT employee_id, name, department, position, current_job, created_at
      FROM employees ORDER BY employee_id
    `;

    const latestAssessments = await sql`
      SELECT DISTINCT ON (employee_id) assessment_id, employee_id, assessed_at, desired_job, career_goal
      FROM assessments
      ORDER BY employee_id, assessment_id DESC
    `;
    const assessmentIds = latestAssessments.map((a) => a.assessment_id as number);

    const scores = assessmentIds.length
      ? await sql`
          SELECT assessment_id, competency_name, current_score
          FROM competency_scores WHERE assessment_id = ANY(${assessmentIds})
        `
      : [];

    // 시트1: 직원별 최신 진단 요약
    const summaryRows = employees.map((e) => {
      const latest = latestAssessments.find((a) => a.employee_id === e.employee_id);
      const row: Record<string, string | number> = {
        사번: e.employee_id,
        이름: e.name,
        부서: e.department,
        직급: e.position ?? "",
        현재직무: e.current_job,
        등록일: e.created_at,
        희망직무: latest?.desired_job ?? "",
        최근진단일시: latest?.assessed_at ?? "",
        커리어목표: latest?.career_goal ?? "",
      };
      for (const name of COMPETENCY_NAMES) {
        const s = latest
          ? scores.find((sc) => sc.assessment_id === latest.assessment_id && sc.competency_name === name)
          : undefined;
        row[name] = s ? (s.current_score as number) : "";
      }
      return row;
    });

    // 시트2: 추천 및 학습 현황
    const recRows = assessmentIds.length
      ? await sql`
          SELECT a.employee_id, r.category, r.title, r.platform, r.stage, r.status, r.completed_at
          FROM recommendations r
          JOIN assessments a ON a.assessment_id = r.assessment_id
          WHERE r.assessment_id = ANY(${assessmentIds})
          ORDER BY a.employee_id, r.recommendation_id
        `
      : [];
    const learningRows = recRows.map((r) => {
      const emp = employees.find((e) => e.employee_id === r.employee_id);
      return {
        사번: r.employee_id,
        이름: emp?.name ?? "",
        부서: emp?.department ?? "",
        구분: r.category,
        제목: r.title,
        플랫폼: r.platform ?? "",
        단계: r.stage,
        상태: r.status,
        완료일: r.completed_at ?? "",
      };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(summaryRows),
      "직원별 최신진단"
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(learningRows),
      "추천 및 학습현황"
    );

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const fileName = `growthpath_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error("[POST /api/admin/export]", err);
    return NextResponse.json(
      { error: "엑셀 파일을 만드는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
