import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMProvider, ReportParams, FreeReportResult, PaidReportResult } from './types';
import { GEMINI_API_KEY } from '$env/static/private';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export class GeminiProvider implements LLMProvider {
	private model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

	async generateFreeReport(params: ReportParams): Promise<FreeReportResult> {
		const { name, gender, mbti, saju, concern } = params;

		// 현재 날짜
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth() + 1;

		const prompt = `당신은 사주명리와 MBTI를 결합한 성격 분석 전문가입니다.

## 현재 시점
- 오늘: ${currentYear}년 ${currentMonth}월
- 운세/시기 언급 시 이 날짜 기준으로 정확히 작성하세요.

## 사용자 정보
- 이름: ${name}
- 성별: ${gender}
- MBTI: ${mbti}
- 사주: ${saju.yearPillar}년 ${saju.monthPillar}월 ${saju.dayPillar}일 ${saju.hourPillar}시
- 일간: ${saju.dayMaster} (${saju.dayMasterElement} - ${saju.dayMasterMeaning})
- 강한 오행: ${saju.strongElement}
- 약한 오행: ${saju.weakElement}
${concern ? `- 고민: ${concern}` : ''}

## 출력 형식
반드시 아래 JSON 형식으로만 응답하세요:

{
  "oneLiner": "이 사람을 한 줄로 표현 (15자 내외, 시적이고 매력적으로)",
  "typeName": "유형 이름 (예: 내향적 개척자, 감성적 전략가 등)",
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "description": "정확히 4문단으로 작성 (각 문단은 \\n\\n으로 구분). 아래 구조를 따르세요:\\n\\n[1문단] 첫인상과 전체 에너지 - 이 사람을 처음 만났을 때 느껴지는 분위기\\n\\n[2문단] 사주 기반 내면 특성 - 일간과 오행이 만드는 내면의 성향\\n\\n[3문단] MBTI 기반 행동 패턴 - 실제로 드러나는 행동 방식과 습관\\n\\n[4문단] 이 조합만의 독특함 - 사주+MBTI가 만나 생기는 특별한 점\\n\\n각 문단에서 핵심 키워드는 **강조**하세요.",
  "strengths": [
    {"title": "강점 제목", "description": "1-2문장 설명"},
    {"title": "강점 제목", "description": "1-2문장 설명"},
    {"title": "강점 제목", "description": "1-2문장 설명"},
    {"title": "강점 제목", "description": "1-2문장 설명"},
    {"title": "강점 제목", "description": "1-2문장 설명"},
    {"title": "강점 제목", "description": "1-2문장 설명"}
  ],
  "weaknesses": [
    {"title": "약점 제목", "description": "1-2문장 설명"},
    {"title": "약점 제목", "description": "1-2문장 설명"},
    {"title": "약점 제목", "description": "1-2문장 설명"},
    {"title": "약점 제목", "description": "1-2문장 설명"},
    {"title": "약점 제목", "description": "1-2문장 설명"},
    {"title": "약점 제목", "description": "1-2문장 설명"}
  ],
  "preview": {
    "sectionTitles": [
      "${concern ? '고민의 근본 원인을 분석하는 창의적 제목' : '이 유형이 자주 겪는 고민'}",
      "현재 시기와 운세의 의미를 담은 제목",
      "고민에 대한 핵심 조언/해결책을 담은 제목",
      "구체적인 행동 가이드를 담은 제목",
      "${name}님에게 전하는 따뜻한 마무리 제목"
    ],
    "teaserText": "당신의 고민에 대한 심층 분석과 맞춤 조언이 준비되어 있어요"
  }
}

## 작성 원칙
- 16personalities 스타일로 매력적이고 긍정적인 톤
- 뻔한 말 금지, 구체적이고 공감되는 표현
- 사주와 MBTI의 조합이 만드는 독특한 특성 강조
- 강점/약점은 커리어, 인간관계, 성장 영역을 골고루 포함
- **마크다운 강조**를 적극 활용하여 핵심 키워드 강조
- description은 정확히 4문단, 각 문단은 빈 줄(\\n\\n)로 구분`;

		const result = await this.model.generateContent(prompt);
		const text = result.response.text();

		// JSON 추출
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error('Failed to parse Gemini response');
		}

		return JSON.parse(jsonMatch[0]) as FreeReportResult;
	}

	async generatePaidReport(_params: ReportParams, _freeContext: FreeReportResult): Promise<PaidReportResult> {
		// Gemini는 무료 전용이므로 유료는 미구현
		throw new Error('Gemini provider does not support paid reports');
	}
}

export const geminiProvider = new GeminiProvider();
