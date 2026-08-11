import type { Config } from "tailwindcss";

/**
 * 화면 전체의 색상·간격 등 디자인 톤을 관리하는 설정 파일입니다.
 * 사내 학습 플랫폼(휴넷)의 화면 톤을 참고해, 민트/틸 계열을 주 색상으로 쓰고
 * 어두운 남색과 보라 그라디언트를 강조색으로 씁니다.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 주 색상: 민트/틸 (버튼, 링크, 강조 표시에 사용)
        brand: {
          50: "#E8F8F6",
          100: "#C7EFEA",
          200: "#93E0D7",
          300: "#5FD0C3",
          400: "#2BC0B0",
          DEFAULT: "#00B3A4",
          600: "#009B8E",
          700: "#007D73",
          800: "#005F58",
        },
        // 어두운 남색: 헤더·사이드바·히어로 배경
        navy: {
          DEFAULT: "#1C1C2B",
          light: "#2A2A3D",
          soft: "#3B3B52",
        },
        // 보조 강조색: 히어로 배너 그라디언트
        violet: {
          DEFAULT: "#7C4DFF",
          deep: "#5B2FD6",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "Apple SD Gothic Neo",
          "Malgun Gothic",
          "Noto Sans KR",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04)",
        lift: "0 12px 24px -8px rgba(16, 24, 40, 0.16)",
      },
      borderRadius: {
        xl2: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
