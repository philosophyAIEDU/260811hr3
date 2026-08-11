/**
 * Gemini API 호출을 한 곳에서 관리하는 파일입니다.
 * 화면7(설정)의 "연결 테스트"와 화면4(AI 맞춤 추천)에서 함께 사용합니다.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL } from "@/lib/config/constants";

/** 입력한 키가 실제로 동작하는지 아주 짧은 요청으로 확인합니다. 실패하면 오류를 던집니다. */
export async function testGeminiKey(apiKey: string): Promise<void> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  await model.generateContent("연결 테스트입니다. '확인'이라고만 답해 주세요.");
}

/**
 * 프롬프트를 보내고 텍스트 응답을 받습니다. (화면4 AI 맞춤 추천에서 사용)
 * asJson을 true로 주면 Gemini가 JSON 형식으로만 답하도록 요청합니다.
 */
export async function generateWithGemini(
  apiKey: string,
  prompt: string,
  options?: { asJson?: boolean }
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: options?.asJson ? { responseMimeType: "application/json" } : undefined,
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}
