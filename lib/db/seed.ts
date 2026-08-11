/**
 * 가상 샘플 데이터 10명을 만드는 스크립트입니다. (실제 직원 정보 아님 — 테스트/시연용)
 *
 * 실행 방법 (Netlify Blobs는 사이트와 연결된 상태에서만 쓸 수 있으므로 Netlify CLI가 필요합니다):
 *   1) npm install -g netlify-cli
 *   2) netlify link   (이 저장소를 만든 Netlify 사이트를 선택해 연결)
 *   3) netlify dev:exec npm run db:seed
 *
 * 이미 등록된 사번은 건너뛰므로 여러 번 실행해도 데이터가 중복되지 않습니다.
 */
import { createAssessment, createEmployee, findEmployee, replaceRecommendations } from "./store";
import { COMPETENCY_NAMES } from "../config/competencies";
import { JOB_REQUIREMENTS } from "../config/jobRequirements";

interface SeedRecommendation {
  category: "사내강의" | "외부주제" | "도서";
  title: string;
  search_keyword: string;
  platform: string;
  reason: string;
  stage: "3개월" | "6개월" | "12개월";
  status: "예정" | "수강중" | "완료";
  completed_at: string | null;
}

interface SeedAssessment {
  assessed_at: string;
  desired_job: string;
  career_goal: string;
  scores: Record<string, number>;
  recommendations?: SeedRecommendation[];
}

interface SeedEmployee {
  employee_id: string;
  name: string;
  department: string;
  current_job: string;
  position: string;
  created_at: string;
  assessments: SeedAssessment[];
}

/** 사람 손으로 하나하나 정하지 않도록, 이름별로 그럴듯하게 다른 점수를 만드는 함수입니다. */
function scoresFor(pattern: number[]): Record<string, number> {
  const result: Record<string, number> = {};
  COMPETENCY_NAMES.forEach((name, i) => {
    result[name] = pattern[i % pattern.length];
  });
  return result;
}

const SAMPLE_EMPLOYEES: SeedEmployee[] = [
  {
    employee_id: "E2024001",
    name: "김하늘",
    department: "영업1팀",
    current_job: "영업",
    position: "대리",
    created_at: "2024-03-04",
    assessments: [
      {
        assessed_at: "2026-05-10 09:30",
        desired_job: "영업",
        career_goal: "3년 내 팀을 이끄는 영업 리더로 성장하고 싶습니다.",
        scores: scoresFor([3, 2, 4, 2, 2, 2, 3, 4, 2, 3]),
      },
      {
        assessed_at: "2026-08-05 10:15",
        desired_job: "영업",
        career_goal: "3년 내 팀을 이끄는 영업 리더로 성장하고 싶습니다. 최근엔 데이터 기반 영업을 배우고 있습니다.",
        scores: scoresFor([4, 3, 5, 3, 3, 3, 4, 5, 2, 4]),
        recommendations: [
          {
            category: "사내강의",
            title: "데이터 기반 영업전략 수립",
            search_keyword: "데이터 기반 영업전략",
            platform: "휴넷",
            reason: "데이터분석 역량이 요구수준 대비 낮아 영업 성과 분석에 어려움을 겪을 수 있습니다.",
            stage: "3개월",
            status: "완료",
            completed_at: "2026-07-20",
          },
          {
            category: "외부주제",
            title: "리더십 기초: 팀을 이끄는 대화법",
            search_keyword: "신임 리더 커뮤니케이션",
            platform: "인프런",
            reason: "팀 리더로 성장하려는 목표에 맞춰 리더십 기본기를 다질 필요가 있습니다.",
            stage: "6개월",
            status: "수강중",
            completed_at: null,
          },
          {
            category: "도서",
            title: "숫자로 말하는 영업",
            search_keyword: "영업 데이터 분석 도서",
            platform: "도서",
            reason: "재무이해와 데이터분석을 함께 다루는 책으로 실무 감각을 키울 수 있습니다.",
            stage: "12개월",
            status: "예정",
            completed_at: null,
          },
        ],
      },
    ],
  },
  {
    employee_id: "E2024002",
    name: "이도윤",
    department: "영업2팀",
    current_job: "영업",
    position: "사원",
    created_at: "2025-01-15",
    assessments: [
      {
        assessed_at: "2026-07-22 14:00",
        desired_job: "마케팅",
        career_goal: "영업 현장 경험을 살려 마케팅 기획으로 직무를 전환하고 싶습니다.",
        scores: scoresFor([3, 2, 4, 2, 3, 2, 3, 4, 1, 3]),
      },
    ],
  },
  {
    employee_id: "E2024003",
    name: "박서연",
    department: "마케팅팀",
    current_job: "마케팅",
    position: "대리",
    created_at: "2023-11-01",
    assessments: [
      {
        assessed_at: "2026-04-02 11:00",
        desired_job: "마케팅",
        career_goal: "브랜드 캠페인을 처음부터 끝까지 직접 기획하고 싶습니다.",
        scores: scoresFor([3, 3, 4, 2, 3, 3, 3, 4, 2, 3]),
      },
      {
        assessed_at: "2026-08-01 13:20",
        desired_job: "마케팅",
        career_goal: "브랜드 캠페인을 처음부터 끝까지 직접 기획하고, 데이터로 성과를 증명하고 싶습니다.",
        scores: scoresFor([4, 4, 4, 3, 4, 4, 4, 5, 2, 4]),
      },
    ],
  },
  {
    employee_id: "E2024004",
    name: "최지훈",
    department: "마케팅팀",
    current_job: "마케팅",
    position: "사원",
    created_at: "2025-06-10",
    assessments: [
      {
        assessed_at: "2026-06-18 10:45",
        desired_job: "기획",
        career_goal: "전사 사업 전략을 다루는 기획 직무로 성장하고 싶습니다.",
        scores: scoresFor([3, 3, 3, 2, 3, 3, 3, 3, 2, 3]),
      },
    ],
  },
  {
    employee_id: "E2024005",
    name: "정유진",
    department: "전략기획팀",
    current_job: "기획",
    position: "과장",
    created_at: "2022-09-01",
    assessments: [
      {
        assessed_at: "2026-07-01 09:00",
        desired_job: "기획",
        career_goal: "신규 사업 진출 전략을 주도적으로 수립하고 싶습니다.",
        scores: scoresFor([4, 4, 4, 3, 4, 3, 4, 3, 4, 4]),
      },
    ],
  },
  {
    employee_id: "E2024006",
    name: "강민준",
    department: "전략기획팀",
    current_job: "기획",
    position: "대리",
    created_at: "2024-02-20",
    assessments: [
      {
        assessed_at: "2026-07-28 16:30",
        desired_job: "IT",
        career_goal: "기획 배경을 살려 프로덕트를 직접 만드는 IT 직무로 전환하고 싶습니다.",
        scores: scoresFor([3, 3, 3, 2, 4, 2, 3, 2, 3, 3]),
      },
    ],
  },
  {
    employee_id: "E2024007",
    name: "윤서아",
    department: "인사팀",
    current_job: "인사",
    position: "사원",
    created_at: "2025-03-17",
    assessments: [
      {
        assessed_at: "2026-06-25 09:50",
        desired_job: "인사",
        career_goal: "채용부터 조직문화까지 아우르는 HR 제너럴리스트가 되고 싶습니다.",
        scores: scoresFor([3, 2, 4, 3, 3, 2, 4, 3, 2, 3]),
      },
    ],
  },
  {
    employee_id: "E2024008",
    name: "임도현",
    department: "인사팀",
    current_job: "인사",
    position: "대리",
    created_at: "2023-08-08",
    assessments: [
      {
        assessed_at: "2026-05-30 15:10",
        desired_job: "인사",
        career_goal: "조직개발과 리더십 육성 전문가로 성장하고 싶습니다.",
        scores: scoresFor([3, 2, 5, 4, 3, 2, 4, 3, 2, 4]),
      },
    ],
  },
  {
    employee_id: "E2024009",
    name: "한소율",
    department: "IT개발팀",
    current_job: "IT",
    position: "사원",
    created_at: "2025-05-02",
    assessments: [
      {
        assessed_at: "2026-08-08 09:15",
        desired_job: "IT",
        career_goal: "서비스를 처음부터 끝까지 만들 수 있는 풀스택 개발자가 되고 싶습니다.",
        scores: scoresFor([4, 4, 3, 2, 3, 5, 3, 2, 1, 4]),
        recommendations: [
          {
            category: "외부주제",
            title: "실전 백엔드 아키텍처 설계",
            search_keyword: "백엔드 아키텍처 설계",
            platform: "유데미",
            reason: "디지털도구활용은 강점이지만 기획력과 재무이해가 낮아 서비스 기획 전반의 이해가 필요합니다.",
            stage: "3개월",
            status: "예정",
            completed_at: null,
          },
          {
            category: "사내강의",
            title: "IT 프로젝트 기획 실무",
            search_keyword: "IT 프로젝트 기획",
            platform: "휴넷",
            reason: "개발 역량 대비 기획력이 부족해 서비스 전체를 설계하는 데 보완이 필요합니다.",
            stage: "6개월",
            status: "예정",
            completed_at: null,
          },
        ],
      },
    ],
  },
  {
    employee_id: "E2024010",
    name: "오준서",
    department: "IT개발팀",
    current_job: "IT",
    position: "과장",
    created_at: "2022-04-11",
    assessments: [
      {
        assessed_at: "2026-07-15 11:40",
        desired_job: "IT",
        career_goal: "팀 전체 기술 방향을 설계하는 테크리드로 성장하고 싶습니다.",
        scores: scoresFor([5, 4, 3, 3, 3, 5, 4, 2, 2, 5]),
      },
    ],
  },
];

async function main() {
  for (const emp of SAMPLE_EMPLOYEES) {
    const existing = await findEmployee(emp.employee_id);
    if (existing) {
      console.log(`- ${emp.employee_id} ${emp.name} 이미 존재 → 건너뜀`);
      continue;
    }

    await createEmployee({
      employee_id: emp.employee_id,
      name: emp.name,
      department: emp.department,
      current_job: emp.current_job,
      position: emp.position,
      created_at: emp.created_at,
    });

    for (const a of emp.assessments) {
      const assessmentId = await createAssessment({
        employee_id: emp.employee_id,
        assessed_at: a.assessed_at,
        desired_job: a.desired_job,
        career_goal: a.career_goal,
        scores: a.scores,
        requiredLevels: JOB_REQUIREMENTS[a.desired_job],
      });

      if (a.recommendations?.length) {
        await replaceRecommendations(assessmentId, a.recommendations);
      }
    }

    console.log(`+ ${emp.employee_id} ${emp.name} 등록 완료 (진단 ${emp.assessments.length}건)`);
  }

  console.log("\n샘플 데이터 시딩이 끝났습니다.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("시딩 중 오류가 발생했습니다:", err);
    process.exit(1);
  });
