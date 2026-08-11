/**
 * 화면6(HR 관리자)의 "엑셀 다운로드" 버튼에서 사용하는 API입니다.
 * 시트1: 직원별 최신 진단 요약 (역량 10개 현재점수 포함)
 * 시트2: 추천 및 학습 현황 (전체 직원의 추천 항목 + 진행 상태)
 */
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { ADMIN_CODE } from "@/lib/config/constants";
import { COMPETENCY_NAMES } from "@/lib/config/competencies";
import { getAllData } from "@/lib/db/store";

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
    const data = await getAllData();

    // 직원별 가장 최근 진단 회차
    const latestByEmployee = new Map<string, number>();
    for (const a of data.assessments) {
      const current = latestByEmployee.get(a.employee_id);
      if (!current || a.assessment_id > current) {
        latestByEmployee.set(a.employee_id, a.assessment_id);
      }
    }

    // 시트1: 직원별 최신 진단 요약
    const summaryRows = data.employees.map((e) => {
      const latestId = latestByEmployee.get(e.employee_id);
      const latest = latestId ? data.assessments.find((a) => a.assessment_id === latestId) : undefined;
      const row: Record<string, string | number> = {
        식별번호: e.employee_id,
        이름: e.name || "(이름 미입력)",
        부서: e.department || "미입력",
        직급: e.position ?? "",
        현재직무: e.current_job || "미입력",
        등록일: e.created_at,
        희망직무: latest?.desired_job ?? "",
        최근진단일시: latest?.assessed_at ?? "",
        커리어목표: latest?.career_goal ?? "",
      };
      for (const name of COMPETENCY_NAMES) {
        const s = latest
          ? data.scores.find((sc) => sc.assessment_id === latest.assessment_id && sc.competency_name === name)
          : undefined;
        row[name] = s ? s.current_score : "";
      }
      return row;
    });

    // 시트2: 추천 및 학습 현황 (모든 직원의 가장 최근 진단 기준)
    const latestAssessmentIds = new Set(latestByEmployee.values());
    const learningRows = data.recommendations
      .filter((r) => latestAssessmentIds.has(r.assessment_id))
      .map((r) => {
        const assessment = data.assessments.find((a) => a.assessment_id === r.assessment_id);
        const emp = assessment ? data.employees.find((e) => e.employee_id === assessment.employee_id) : undefined;
        return {
          식별번호: emp?.employee_id ?? "",
          이름: emp?.name || "(이름 미입력)",
          부서: emp?.department || "미입력",
          구분: r.category,
          제목: r.title,
          플랫폼: r.platform ?? "",
          단계: r.stage,
          상태: r.status,
          완료일: r.completed_at ?? "",
        };
      });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "직원별 최신진단");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(learningRows), "추천 및 학습현황");

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
