import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, ReportParams, FreeReportResult, PaidReportResult } from './types';
import { ANTHROPIC_API_KEY } from '$env/static/private';

const client = new Anthropic({
	apiKey: ANTHROPIC_API_KEY
});

// 섹션 타입
interface Section {
	slot: number;
	title: string;
	content: string;
}

export class ClaudeProvider implements LLMProvider {
	async generateFreeReport(params: ReportParams): Promise<FreeReportResult> {
		throw new Error('Claude provider does not support free reports');
	}

	async generatePaidReport(params: ReportParams, freeContext: FreeReportResult): Promise<PaidReportResult> {
		const { name, gender, mbti, saju, concern } = params;

		// 공통 컨텍스트
		const baseContext = `## 사용자 정보
- 이름: ${name}
- 성별: ${gender}
- MBTI: ${mbti}
- 사주: ${saju.yearPillar}년 ${saju.monthPillar}월 ${saju.dayPillar}일 ${saju.hourPillar}시
- 일간: ${saju.dayMaster} (${saju.dayMasterElement} - ${saju.dayMasterMeaning})
- 강한 오행: ${saju.strongElement} / 약한 오행: ${saju.weakElement}

## 이전 분석 요약
- 유형: ${freeContext.typeName}
- 키워드: ${freeContext.keywords.join(', ')}

## 고민
${concern.trim() || '(미입력 - 사주/MBTI 기반으로 추론)'}`;

		const baseSystem = `당신은 사주명리와 MBTI를 결합한 상담 전문가입니다.
- 친근하지만 가볍지 않은 "~해요" 체
- 구체적인 비유와 은유 사용
- **마크다운 강조** 적극 활용
- 뻔한 말 금지, 구체적 조언`;

		// 3개 파트 병렬 생성
		console.log('Starting parallel generation...');
		const startTime = Date.now();

		const [part1Result, part2Result, part3Result] = await Promise.all([
			// Part 1: 나를 알기 (slots 1-5)
			this.generatePart1(name, mbti, baseContext, baseSystem),
			// Part 2: 고민 분석 (slots 6-9)
			this.generatePart2(name, concern, baseContext, baseSystem),
			// Part 3: 마무리 (slot 10 + oneLiner)
			this.generatePart3(name, baseContext, baseSystem)
		]);

		console.log(`Parallel generation completed in ${Date.now() - startTime}ms`);

		// 결과 합치기
		const allSections: Section[] = [
			...part1Result,
			...part2Result,
			...part3Result.sections
		].sort((a, b) => a.slot - b.slot);

		return {
			oneLiner: part3Result.oneLiner,
			sections: allSections
		};
	}

	// Part 1: 나를 알기 (slots 1-5)
	private async generatePart1(name: string, mbti: string, context: string, system: string): Promise<Section[]> {
		const response = await client.messages.create({
			model: 'claude-sonnet-4-5-20250929',
			max_tokens: 4096,
			system,
			messages: [{
				role: 'user',
				content: `${context}

## 작성할 섹션 (각 2-3문단)
1. "${name}님은 이런 사람이에요" - 전체적인 인물 소개
2. "사주로 본 나의 기본 에너지" - 일간/오행 분석
3. "MBTI로 본 나의 행동 방식" - ${mbti} 특성
4. "타고난 재능과 잘하는 것" - 강점
5. "주의해야 할 부분" - 약점/성장점`
			}],
			tools: [{
				name: 'write_sections',
				description: '섹션 5개 작성',
				input_schema: {
					type: 'object' as const,
					properties: {
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
					required: ['sections']
				}
			}],
			tool_choice: { type: 'tool' as const, name: 'write_sections' }
		});

		const toolUse = response.content.find(block => block.type === 'tool_use');
		if (!toolUse || toolUse.type !== 'tool_use') throw new Error('Part 1 failed');
		return (toolUse.input as { sections: Section[] }).sections;
	}

	// Part 2: 고민 분석 (slots 6-9)
	private async generatePart2(name: string, concern: string, context: string, system: string): Promise<Section[]> {
		const concernText = concern.trim() || '이 사람의 사주/MBTI 조합이 흔히 겪는 고민을 추론하여 작성';

		const response = await client.messages.create({
			model: 'claude-sonnet-4-5-20250929',
			max_tokens: 4096,
			system,
			messages: [{
				role: 'user',
				content: `${context}

## 작성할 섹션 (각 2-3문단, 제목은 창의적으로)
6. 고민의 근본 원인 분석 - "${concernText}"
7. 현재 시기의 의미 (2025-2026년 운세 흐름)
8. 고민에 대한 직접적인 답변/조언
9. 구체적인 행동 가이드 (3개월 내 실천사항)`
			}],
			tools: [{
				name: 'write_sections',
				description: '섹션 4개 작성',
				input_schema: {
					type: 'object' as const,
					properties: {
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
					required: ['sections']
				}
			}],
			tool_choice: { type: 'tool' as const, name: 'write_sections' }
		});

		const toolUse = response.content.find(block => block.type === 'tool_use');
		if (!toolUse || toolUse.type !== 'tool_use') throw new Error('Part 2 failed');
		return (toolUse.input as { sections: Section[] }).sections;
	}

	// Part 3: 마무리 (slot 10 + oneLiner)
	private async generatePart3(name: string, context: string, system: string): Promise<{ oneLiner: string; sections: Section[] }> {
		const response = await client.messages.create({
			model: 'claude-sonnet-4-5-20250929',
			max_tokens: 2048,
			system,
			messages: [{
				role: 'user',
				content: `${context}

## 작성할 내용
1. oneLiner: 이 사람을 시적으로 표현한 한 줄 (15자 내외)
2. 섹션 10: "${name}님에게 전하는 말" - 따뜻한 마무리 (2-3문단)`
			}],
			tools: [{
				name: 'write_closing',
				description: '마무리 작성',
				input_schema: {
					type: 'object' as const,
					properties: {
						oneLiner: { type: 'string' },
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
			tool_choice: { type: 'tool' as const, name: 'write_closing' }
		});

		const toolUse = response.content.find(block => block.type === 'tool_use');
		if (!toolUse || toolUse.type !== 'tool_use') throw new Error('Part 3 failed');
		return toolUse.input as { oneLiner: string; sections: Section[] };
	}
}

export const claudeProvider = new ClaudeProvider();
