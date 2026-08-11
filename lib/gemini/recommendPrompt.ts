/**
 * 화면4(AI 맞춤 추천)에서 Gemini에 보낼 프롬프트를 만들고, 돌아온 JSON 응답을 검증하는 파일입니다.
 * 이름·사번 등 개인을 특정할 수 있는 정보는 절대 프롬프트에 넣지 않습니다.
 */
import { RECOMMENDATION_CATEGORIES, ROADMAP_STAGES } from "@/lib/config/constants";

export interface CompetencyGapInput {
  name: string;
  current_score: number;
  required_level: number;
}

export interface RecommendPromptInput {
  desired_job: string;
  current_job: string;
  career_goal: string;
  gaps: CompetencyGapInput[]; // 역량 10개 전체 (현재점수·요구수준 포함)
}

export interface RecommendationItem {
  category: (typeof RECOMMENDATION_CATEGORIES)[number];
  title: string;
  search_keyword: string;
  platform: string;
  reason: string;
  stage: (typeof ROADMAP_STAGES)[number];
}

/**
 * 프롬프트 본문입니다. Gemini가 아래 형식의 JSON "만" 답하도록 강하게 지시합니다.
 * (개인정보 미포함, 역량명은 competencies.ts와 정확히 같은 철자를 쓰도록 명시)
 */
export function buildRecommendPrompt(input: RecommendPromptInput): string {
  const gapLines = input.gaps
    .map((g) => {
      const gap = g.required_level - g.current_score;
      const flag = gap >= 2 ? " ← 우선 보완 필요" : "";
      return `- ${g.name}: 현재점수 ${g.current_score} / 요구수준 ${g.required_level}${flag}`;
    })
    .join("\n");

  return `당신은 사내 인재육성 담당 AI 코치입니다. 아래 직원(익명)의 역량 자가진단 결과를 보고,
학습 추천과 성장 로드맵을 JSON으로만 만들어 주세요. 개인 이름이나 사번은 전달되지 않았고
앞으로도 필요하지 않습니다.

[현재직무] ${input.current_job || "미입력"}
[희망직무] ${input.desired_job}
[커리어 목표] ${input.career_goal}

[역량 자가진단 결과 (1~5점, 요구수준은 희망직무 기준)]
${gapLines}

[요청사항]
1. 위에서 "요구수준 − 현재점수" 격차가 큰 역량을 우선적으로 다루되, 전체적인 성장도 고려해 주세요.
2. 추천 항목은 아래 3가지 구분(category)을 적절히 섞어 총 6~9개 만들어 주세요.
   - "사내강의": 회사 사내교육 플랫폼(휴넷)에서 들을 만한 강의 주제. platform은 반드시 "휴넷".
   - "외부주제": 외부 강의 플랫폼(인프런, 유데미, 코세라 등)에서 찾아볼 만한 학습 주제. platform에 플랫폼명을 적어 주세요.
   - "도서": 실제로 존재할 법한 도서 제목과 저자 스타일로. platform은 "도서"로 적어 주세요.
3. 각 항목은 "3개월"/"6개월"/"12개월" 중 하나의 stage(단계)를 배정해, 단기→장기로 이어지는
   성장 로드맵이 되도록 해주세요. (3개월 단계에 최소 1개 이상 포함)
4. search_keyword는 그 플랫폼에서 실제 검색할 만한 짧은 한글 키워드로 만들어 주세요.
   (실제 강의 URL이나 ISBN 등 확인할 수 없는 정보는 절대 지어내지 마세요)
5. reason은 왜 이 항목이 이 직원에게 필요한지 1~2문장으로, 위 역량 격차나 커리어 목표와
   연결지어 설명해 주세요.
6. 아래 JSON 형식 외의 어떤 문장도 출력하지 마세요. 마크다운 코드블록도 쓰지 마세요.

{
  "recommendations": [
    {
      "category": "사내강의" | "외부주제" | "도서",
      "title": "짧은 제목",
      "search_keyword": "검색용 키워드",
      "platform": "휴넷 | 인프런 | 유데미 | 코세라 | 도서 등",
      "reason": "추천 이유 1~2문장",
      "stage": "3개월" | "6개월" | "12개월"
    }
  ]
}`;
}

/** Gemini 응답 문자열(JSON)을 파싱하고, 형식이 올바른 항목만 걸러서 돌려줍니다. */
export function parseRecommendResponse(raw: string): RecommendationItem[] {
  const cleaned = raw.trim().replace(/^```json\s*|^```\s*|```$/g, "");
  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch {
    throw new Error("AI 응답을 이해할 수 없는 형식입니다.");
  }

  const list = (data as { recommendations?: unknown })?.recommendations;
  if (!Array.isArray(list)) {
    throw new Error("AI 응답에 추천 목록이 없습니다.");
  }

  const items: RecommendationItem[] = [];
  for (const entry of list) {
    if (typeof entry !== "object" || entry === null) continue;
    const r = entry as Record<string, unknown>;
    const category = String(r.category ?? "");
    const stage = String(r.stage ?? "");
    const title = String(r.title ?? "").trim();
    const reason = String(r.reason ?? "").trim();

    if (!RECOMMENDATION_CATEGORIES.includes(category as (typeof RECOMMENDATION_CATEGORIES)[number]))
      continue;
    if (!ROADMAP_STAGES.includes(stage as (typeof ROADMAP_STAGES)[number])) continue;
    if (!title || !reason) continue;

    items.push({
      category: category as (typeof RECOMMENDATION_CATEGORIES)[number],
      title,
      search_keyword: String(r.search_keyword ?? "").trim(),
      platform: String(r.platform ?? "").trim(),
      reason,
      stage: stage as (typeof ROADMAP_STAGES)[number],
    });
  }

  if (items.length === 0) {
    throw new Error("AI가 만든 추천 중 사용할 수 있는 항목이 없습니다.");
  }

  return items;
}
