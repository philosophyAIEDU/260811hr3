/**
 * 화면1(시작)에서 사용하는 API입니다.
 * GET  : 사번+이름으로 기존 직원인지 확인 (다른 사람 정보가 보이지 않도록 이름까지 함께 확인합니다)
 * POST : 처음 보는 사번을 부서·직무·직급과 함께 등록합니다.
 */
import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db/db";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  const employeeId = req.nextUrl.searchParams.get("employee_id")?.trim();
  const name = req.nextUrl.searchParams.get("name")?.trim();

  if (!employeeId || !name) {
    return fail("사번과 이름을 모두 입력해 주세요.");
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT employee_id, name, department, current_job, position, created_at
      FROM employees WHERE employee_id = ${employeeId}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ found: false });
    }

    const employee = rows[0];
    // 사번은 있지만 이름이 다르면, 사번 존재 여부를 알려주지 않고 동일한 안내만 표시합니다.
    if (employee.name !== name) {
      return fail("사번과 이름이 일치하지 않습니다. 다시 확인해 주세요.");
    }

    return NextResponse.json({ found: true, employee });
  } catch (err) {
    console.error("[GET /api/employee]", err);
    return fail("데이터를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("요청 형식이 올바르지 않습니다.");
  }

  const employeeId = String(body.employee_id ?? "").trim();
  const name = String(body.name ?? "").trim();
  const department = String(body.department ?? "").trim();
  const currentJob = String(body.current_job ?? "").trim();
  const position = String(body.position ?? "").trim();

  if (!employeeId || !name || !department || !currentJob) {
    return fail("사번, 이름, 부서, 현재직무는 필수 입력 항목입니다.");
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const existing = await sql`SELECT employee_id, name FROM employees WHERE employee_id = ${employeeId}`;

    if (existing.length > 0) {
      if (existing[0].name !== name) {
        return fail("이미 등록된 사번입니다. 이름을 다시 확인해 주세요.");
      }
      // 이미 등록된 사람이 다시 요청한 경우 - 그대로 성공 처리 (중복 등록 방지)
      return NextResponse.json({ ok: true, alreadyRegistered: true });
    }

    const createdAt = new Date().toISOString().slice(0, 10);
    await sql`
      INSERT INTO employees (employee_id, name, department, current_job, position, created_at)
      VALUES (${employeeId}, ${name}, ${department}, ${currentJob}, ${position || null}, ${createdAt})
    `;

    return NextResponse.json({ ok: true, alreadyRegistered: false });
  } catch (err) {
    console.error("[POST /api/employee]", err);
    return fail("등록 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
}
