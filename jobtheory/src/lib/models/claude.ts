import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, ReportParams, FreeReportResult, PaidReportResult } from './types';
import { ANTHROPIC_API_KEY } from '$env/static/private';

const client = new Anthropic({
	apiKey: ANTHROPIC_API_KEY
});

export class ClaudeProvider implements LLMProvider {
	async generateFreeReport(params: ReportParams): Promise<FreeReportResult> {
		// Claude는 유료 전용이므로 무료는 미구현
		throw new Error('Claude provider does not support free reports');
	}

	async generatePaidReport(params: ReportParams, freeContext: FreeReportResult): Promise<PaidReportResult> {
		const { name, gender, mbti, saju, concern } = params;

		const systemPrompt = `당신은 동양 철학(사주명리)과 현대 심리학(MBTI)을 결합하여 사람들의 고민에 맞춤형 조언을 제공하는 전문 상담사입니다.

## 핵심 원칙 (Jobs-to-be-Done)
사용자가 진짜 원하는 것은 '운세 예측'이 아니라:
1. **확신** - "내 선택이 맞다"는 허락
2. **이해** - "나는 이런 사람이구나"라는 자기 이해
3. **희망** - "앞으로 나아질 수 있다"는 방향성

## 말투
- 친근하지만 가볍지 않게, "~해요" 체
- 이름을 자연스럽게 호명
- 구체적인 비유와 은유 사용
- **절대 뻔한 말 금지** - "긍정적으로 생각하세요" 같은 말 대신 구체적 조언

## 사주 해석 키
- 일간 ${saju.dayMaster}(${saju.dayMasterElement}): ${saju.dayMasterMeaning}
- 강한 오행 ${saju.strongElement}: 과하면 주의
- 약한 오행 ${saju.weakElement}: 보완 필요
- 오행 분포: 목(${saju.elementCount.목}) 화(${saju.elementCount.화}) 토(${saju.elementCount.토}) 금(${saju.elementCount.금}) 수(${saju.elementCount.수})

## MBTI ${mbti} 통합
사주와 MBTI가 충돌하면: "겉으로는 ~하지만, 내면 깊은 곳에서는 ~"

## 중요: 이전 내용과의 연계
사용자는 이미 다음 내용을 확인했습니다. 이 내용을 **그대로 반복하지 말고**, 더 깊이 있는 분석을 제공하세요:
- 한 줄 소개: "${freeContext.oneLiner}"
- 유형: ${freeContext.typeName}
- 키워드: ${freeContext.keywords.join(', ')}

위 내용을 언급할 때 "앞서 말씀드린", "처음에 소개한" 등의 자연스러운 표현을 사용하세요. "무료", "유료", "티저" 같은 상품 관련 단어는 절대 사용하지 마세요.

## 출력 형식
각 섹션의 content는 **2-3문단** 분량으로 풍성하게 작성하세요. 마크다운 문법 사용 가능합니다.

{
  "oneLiner": "이 사람을 한 줄로 표현 (15자 내외, 앞서 제공한 것과 다르게)",
  "sections": [
    {
      "slot": 1,
      "title": "${name}님은 이런 사람이에요",
      "content": "내용 (2-3문단, 마크다운 가능)"
    },
    {
      "slot": 2,
      "title": "사주로 본 나의 기본 에너지",
      "content": "일간과 오행 분석을 바탕으로 2-3문단..."
    },
    {
      "slot": 3,
      "title": "MBTI로 본 나의 행동 방식",
      "content": "${mbti} 특성과 사주의 조화를 2-3문단..."
    },
    {
      "slot": 4,
      "title": "타고난 재능과 잘하는 것",
      "content": "구체적인 강점 분석 2-3문단..."
    },
    {
      "slot": 5,
      "title": "주의해야 할 부분",
      "content": "발전을 위한 조언 2-3문단..."
    },
    {
      "slot": 6,
      "title": "[고민에 맞는 동적 제목 - 예: 왜 지금 떠나고 싶을까요]",
      "content": "고민의 근본 원인 분석 2-3문단..."
    },
    {
      "slot": 7,
      "title": "[현재 시기 관련 동적 제목 - 예: 2026년, 움직여야 할 때]",
      "content": "지금 이 시기의 의미 2-3문단..."
    },
    {
      "slot": 8,
      "title": "[고민에 대한 직접 답변 - 예: 지금 움직여도 됩니다]",
      "content": "핵심 조언 2-3문단..."
    },
    {
      "slot": 9,
      "title": "[구체적 행동 가이드 - 예: 3개월 안에 해볼 것들]",
      "content": "실천 방안 2-3문단..."
    },
    {
      "slot": 10,
      "title": "${name}님에게 전하는 말",
      "content": "따뜻한 마무리 2-3문단..."
    }
  ]
}

**중요**:
- slot 6, 7, 8, 9의 title은 사용자의 고민에 맞게 창의적으로 생성하세요.
- 각 섹션의 content는 반드시 **2-3문단** 이상 작성하세요. 짧은 답변은 절대 금지입니다.
- 마크다운 **강조(bold)** 문법을 적극 활용하세요. 핵심 키워드, 중요한 조언, 감정적 포인트에 **굵은 글씨**를 사용하여 가독성을 높이세요.`;

		const concernSection = concern.trim()
			? `## 사용자의 고민 (이것이 가장 중요합니다)
"${concern}"

이 고민에 집중하여 10개 섹션 모두 작성해주세요. 특히 slot 6~9는 이 고민에 직접적으로 답하는 내용이어야 합니다.`
			: `## 사용자의 고민
(미입력) 사주와 MBTI를 기반으로 이 사람이 가장 공감할 만한 핵심 고민을 추론하여 리포트를 작성해주세요.`;

		const userPrompt = `## 사용자 정보
- 이름: ${name}
- 성별: ${gender}
- MBTI: ${mbti}
- 사주: ${saju.yearPillar}년 ${saju.monthPillar}월 ${saju.dayPillar}일 ${saju.hourPillar}시
- 일간: ${saju.dayMaster} (${saju.dayMasterElement} - ${saju.dayMasterMeaning})

${concernSection}`;

		const response = await client.messages.create({
			model: 'claude-sonnet-4-5-20250929',
			max_tokens: 16384,
			messages: [{ role: 'user', content: userPrompt }],
			system: systemPrompt,
			tools: [{
				name: 'generate_report',
				description: '사주와 MBTI 기반 맞춤형 리포트를 생성합니다',
				input_schema: {
					type: 'object' as const,
					properties: {
						oneLiner: {
							type: 'string',
							description: '이 사람을 한 줄로 표현 (무료와 다르게)'
						},
						sections: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									slot: { type: 'number' },
									title: { type: 'string' },
									content: { type: 'string' }
								},
								required: ['slot', 'title', 'content']
							}
						}
					},
					required: ['oneLiner', 'sections']
				}
			}],
			tool_choice: { type: 'tool' as const, name: 'generate_report' }
		});

		// 응답 완료 여부 확인
		console.log('Claude response stop_reason:', response.stop_reason);
		console.log('Claude response usage:', response.usage);

		if (response.stop_reason === 'max_tokens') {
			console.warn('WARNING: Response was truncated due to max_tokens limit!');
		}

		const toolUse = response.content.find(block => block.type === 'tool_use');
		if (!toolUse || toolUse.type !== 'tool_use') {
			throw new Error('No tool use in response');
		}

		return toolUse.input as PaidReportResult;
	}
}

export const claudeProvider = new ClaudeProvider();
