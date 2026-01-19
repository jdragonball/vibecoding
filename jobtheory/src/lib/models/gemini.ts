import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMProvider, ReportParams, FreeReportResult, PaidReportResult } from './types';
import { GEMINI_API_KEY } from '$env/static/private';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export class GeminiProvider implements LLMProvider {
	private model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

	async generateFreeReport(params: ReportParams): Promise<FreeReportResult> {
		const { name, gender, mbti, saju, concern } = params;

		const prompt = `당신은 사주명리와 MBTI를 결합한 성격 분석 전문가입니다.

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
  "description": "이 사람의 핵심 성격을 3-4문단으로 상세히 설명. 사주의 일간 특성과 MBTI를 자연스럽게 녹여서 설명. 16personalities처럼 풍성하고 공감되게 작성.",
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
      "${concern ? '고민에 맞는 구체적 제목' : '이 유형이 자주 겪는 고민'}",
      "2025년 운세와 흐름",
      "구체적인 행동 가이드",
      "${name}님에게 전하는 말"
    ],
    "teaserText": "당신의 고민에 대한 심층 분석과 맞춤 조언이 준비되어 있어요"
  }
}

## 작성 원칙
- 16personalities 스타일로 매력적이고 긍정적인 톤
- 뻔한 말 금지, 구체적이고 공감되는 표현
- 사주와 MBTI의 조합이 만드는 독특한 특성 강조
- 강점/약점은 커리어, 인간관계, 성장 영역을 골고루 포함
- description은 최소 3문단 이상으로 풍성하게`;

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
