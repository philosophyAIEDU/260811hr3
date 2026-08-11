/**
 * 화면6(HR 관리자)에서 사용하는 통계 API입니다.
 * 항상 "직원별 가장 최근 진단 1건"만 집계에 사용합니다. (과거 진단까지 합치면 통계가 왜곡되므로)
 */
import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db/db";
import { ADMIN_CODE } from "@/lib/config/constants";
import { COMPETENCY_NAMES } from "@/lib/config/competencies";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  const adminCode = req.nextUrl.searchParams.get("admin_code") ?? "";
  if (adminCode !== ADMIN_CODE) {
    return fail("관리자 코드가 올바르지 않습니다.", 401);
  }

  try {
    await ensureSchema();
    const sql = getSql();

    const totalEmployeesRows = await sql`SELECT COUNT(*)::int AS count FROM employees`;
    const totalEmployees = totalEmployeesRows[0].count as number;

    // 직원별 가장 최근 진단 회차 + 그 회차의 역량점수
    const rows = await sql`
      WITH latest AS (
        SELECT DISTINCT ON (employee_id) assessment_id, employee_id
        FROM assessments
        ORDER BY employee_id, assessment_id DESC
      )
      SELECT e.employee_id, e.department, cs.competency_name, cs.current_score, cs.required_level
      FROM latest l
      JOIN employees e ON e.employee_id = l.employee_id
      JOIN competency_scores cs ON cs.assessment_id = l.assessment_id
    `;

    const diagnosedEmployeeIds = new Set(rows.map((r) => r.employee_id as string));

    // 부서별 평균 현재점수
    const deptTotals = new Map<string, { sum: number; count: number; employees: Set<string> }>();
    for (const r of rows) {
      const dept = r.department as string;
      const entry = deptTotals.get(dept) ?? { sum: 0, count: 0, employees: new Set<string>() };
      entry.sum += r.current_score as number;
      entry.count += 1;
      entry.employees.add(r.employee_id as string);
      deptTotals.set(dept, entry);
    }
    const departmentAverages = Array.from(deptTotals.entries())
      .map(([department, v]) => ({
        department,
        average: Math.round((v.sum / v.count) * 100) / 100,
        employeeCount: v.employees.size,
      }))
      .sort((a, b) => a.department.localeCompare(b.department));

    // 전사 기준 부족역량 TOP5 (요구수준 - 현재점수 평균이 큰 순)
    const gapTotals = new Map<string, { sum: number; count: number }>();
    for (const name of COMPETENCY_NAMES) gapTotals.set(name, { sum: 0, count: 0 });
    for (const r of rows) {
      const entry = gapTotals.get(r.competency_name as string);
      if (!entry) continue;
      entry.sum += (r.required_level as number) - (r.current_score as number);
      entry.count += 1;
    }
    const competencyGapTop5 = Array.from(gapTotals.entries())
      .filter(([, v]) => v.count > 0)
      .map(([competency, v]) => ({ competency, averageGap: Math.round((v.sum / v.count) * 100) / 100 }))
      .sort((a, b) => b.averageGap - a.averageGap)
      .slice(0, 5);

    return NextResponse.json({
      totalEmployees,
      diagnosedEmployees: diagnosedEmployeeIds.size,
      departmentAverages,
      competencyGapTop5,
    });
  } catch (err) {
    console.error("[GET /api/admin]", err);
    return fail("통계를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
}
