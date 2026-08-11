/**
 * 화면6(HR 관리자)에서 사용하는 통계 API입니다.
 * 항상 "직원별 가장 최근 진단 1건"만 집계에 사용합니다. (과거 진단까지 합치면 통계가 왜곡되므로)
 */
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_CODE } from "@/lib/config/constants";
import { COMPETENCY_NAMES } from "@/lib/config/competencies";
import { getAllData } from "@/lib/db/store";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  const adminCode = req.nextUrl.searchParams.get("admin_code") ?? "";
  if (adminCode !== ADMIN_CODE) {
    return fail("관리자 코드가 올바르지 않습니다.", 401);
  }

  try {
    const data = await getAllData();
    const totalEmployees = data.employees.length;

    // 직원별 가장 최근 진단 회차 찾기
    const latestByEmployee = new Map<string, number>();
    for (const a of data.assessments) {
      const current = latestByEmployee.get(a.employee_id);
      if (!current || a.assessment_id > current) {
        latestByEmployee.set(a.employee_id, a.assessment_id);
      }
    }
    const latestAssessmentIds = new Set(latestByEmployee.values());

    const departmentOf = new Map(data.employees.map((e) => [e.employee_id, e.department]));

    const deptTotals = new Map<string, { sum: number; count: number; employees: Set<string> }>();
    const gapTotals = new Map<string, { sum: number; count: number }>();
    for (const name of COMPETENCY_NAMES) gapTotals.set(name, { sum: 0, count: 0 });

    for (const score of data.scores) {
      if (!latestAssessmentIds.has(score.assessment_id)) continue;
      const assessment = data.assessments.find((a) => a.assessment_id === score.assessment_id);
      if (!assessment) continue;
      const department = departmentOf.get(assessment.employee_id) ?? "미분류";

      const deptEntry =
        deptTotals.get(department) ?? { sum: 0, count: 0, employees: new Set<string>() };
      deptEntry.sum += score.current_score;
      deptEntry.count += 1;
      deptEntry.employees.add(assessment.employee_id);
      deptTotals.set(department, deptEntry);

      const gapEntry = gapTotals.get(score.competency_name);
      if (gapEntry) {
        gapEntry.sum += score.required_level - score.current_score;
        gapEntry.count += 1;
      }
    }

    const departmentAverages = Array.from(deptTotals.entries())
      .map(([department, v]) => ({
        department,
        average: Math.round((v.sum / v.count) * 100) / 100,
        employeeCount: v.employees.size,
      }))
      .sort((a, b) => a.department.localeCompare(b.department));

    const competencyGapTop5 = Array.from(gapTotals.entries())
      .filter(([, v]) => v.count > 0)
      .map(([competency, v]) => ({ competency, averageGap: Math.round((v.sum / v.count) * 100) / 100 }))
      .sort((a, b) => b.averageGap - a.averageGap)
      .slice(0, 5);

    return NextResponse.json({
      totalEmployees,
      diagnosedEmployees: latestByEmployee.size,
      departmentAverages,
      competencyGapTop5,
    });
  } catch (err) {
    console.error("[GET /api/admin]", err);
    return fail("통계를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
}
