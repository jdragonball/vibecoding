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

// sections 파싱 헬퍼 (문자열로 올 경우 처리)
function parseSections(input: unknown): Section[] {
	if (!input || typeof input !== 'object') {
		throw new Error('Invalid input');
	}

	const obj = input as Record<string, unknown>;
	let sections = obj.sections;

	// sections가 문자열이면 JSON 파싱 시도
	if (typeof sections === 'string') {
		try {
			// 먼저 그대로 파싱 시도
			sections = JSON.parse(sections);
		} catch (e1) {
			// 실패하면 잘린 JSON 복구 시도
			try {
				let fixed = sections as string;
				// 마지막 완전한 객체까지만 추출
				const lastCompleteObj = fixed.lastIndexOf('}');
				if (lastCompleteObj > 0) {
					fixed = fixed.substring(0, lastCompleteObj + 1) + ']';
				}
				sections = JSON.parse(fixed);
				console.log('Recovered truncated JSON, got', (sections as Section[]).length, 'sections');
			} catch (e2) {
				console.error('JSON parse failed. Original error:', e1);
				console.error('Recovery error:', e2);
				console.error('Raw string (first 500 chars):', (sections as string).substring(0, 500));
				throw new Error('Failed to parse sections string');
			}
		}
	}

	if (!Array.isArray(sections)) {
		throw new Error('sections is not an array');
	}

	return sections as Section[];
}

export class ClaudeProvider implements LLMProvider {
	async generateFreeReport(params: ReportParams): Promise<FreeReportResult> {
		throw new Error('Claude provider does not support free reports');
	}

	async generatePaidReport(params: ReportParams, freeContext: FreeReportResult): Promise<PaidReportResult> {
		const { name, gender, mbti, saju, concern } = params;

		// 무료 리포트에서 이미 다룬 내용 요약
		const freeStrengths = freeContext.strengths.map(s => s.title).join(', ');
		const freeWeaknesses = freeContext.weaknesses.map(w => w.title).join(', ');

		// 공통 컨텍스트
		const baseContext = `## 사용자 정보
- 이름: ${name}
- 성별: ${gender}
- MBTI: ${mbti}
- 사주: ${saju.yearPillar}년 ${saju.monthPillar}월 ${saju.dayPillar}일 ${saju.hourPillar}시
- 일간: ${saju.dayMaster} (${saju.dayMasterElement} - ${saju.dayMasterMeaning})
- 강한 오행: ${saju.strongElement} / 약한 오행: ${saju.weakElement}

## 무료 리포트에서 이미 다룬 내용 (반복 금지!)
- 유형명: ${freeContext.typeName}
- 키워드: ${freeContext.keywords.join(', ')}
- 이미 언급한 강점: ${freeStrengths}
- 이미 언급한 약점: ${freeWeaknesses}
- 성격 설명 요약: ${freeContext.description.substring(0, 200)}...

⚠️ 위 내용은 무료 리포트에서 이미 사용자가 본 내용입니다. 같은 표현, 같은 관점을 반복하지 말고 더 깊이 있고 새로운 시각으로 작성하세요.

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

		// 무료에서 약속한 섹션 제목들
		const previewTitles = freeContext.preview?.sectionTitles || [];

		const [part1Result, part2Result, part3Result] = await Promise.all([
			// Part 1: 나를 알기 (slots 1-5)
			this.generatePart1(name, mbti, baseContext, baseSystem),
			// Part 2: 심층 분석 (slots 6-9) - 고민 있으면 고민 분석, 없으면 사주/MBTI 기반 분석
			this.generatePart2(name, concern, baseContext, baseSystem, previewTitles),
			// Part 3: 마무리 (slot 10 + oneLiner)
			this.generatePart3(name, baseContext, baseSystem, previewTitles[4])
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
5. "주의해야 할 부분" - 약점/성장점

⚠️ 중복 방지: 이 파트는 "나를 알기" 영역입니다.
- 심층 분석, 운세, 조언, 행동 가이드는 다른 파트에서 다루니 여기서 언급하지 마세요.
- 무료에서 이미 다룬 강점/약점과 다른 관점으로 작성하세요.`
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
		if (!toolUse || toolUse.type !== 'tool_use') {
			console.error('Part 1 no tool_use found');
			throw new Error('Part 1 failed: no tool_use');
		}
		try {
			return parseSections(toolUse.input);
		} catch (e) {
			console.error('Part 1 parse error:', e, 'input:', JSON.stringify(toolUse.input));
			throw new Error('Part 1 failed: ' + (e as Error).message);
		}
	}

	// Part 2: 심층 분석 (slots 6-9) - 고민 있으면 고민 분석, 없으면 사주/MBTI 기반 분석
	private async generatePart2(name: string, concern: string, context: string, system: string, previewTitles: string[]): Promise<Section[]> {
		// 무료에서 약속한 제목들
		const title6 = previewTitles[0] || '고민의 근본 원인';
		const title7 = previewTitles[1] || '2025-2026년 운세 흐름';
		const title8 = previewTitles[2] || '고민에 대한 핵심 조언';
		const title9 = previewTitles[3] || '구체적인 행동 가이드';

		const response = await client.messages.create({
			model: 'claude-sonnet-4-5-20250929',
			max_tokens: 8192,
			system,
			messages: [{
				role: 'user',
				content: `${context}

아래 4개 섹션을 작성하세요. 각 섹션은 2문단입니다. 간결하게 작성하세요.

섹션 6 (slot: 6) - 제목: "${title6}" - 고민의 근본 원인
섹션 7 (slot: 7) - 제목: "${title7}" - 현재 시기의 의미
섹션 8 (slot: 8) - 제목: "${title8}" - 핵심 조언
섹션 9 (slot: 9) - 제목: "${title9}" - 실천사항`
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
		if (!toolUse || toolUse.type !== 'tool_use') {
			console.error('Part 2 no tool_use found');
			throw new Error('Part 2 failed: no tool_use');
		}
		try {
			return parseSections(toolUse.input);
		} catch (e) {
			console.error('Part 2 parse error:', e, 'input:', JSON.stringify(toolUse.input));
			throw new Error('Part 2 failed: ' + (e as Error).message);
		}
	}

	// Part 3: 마무리 (slot 10 + oneLiner)
	private async generatePart3(name: string, context: string, system: string, closingTitle?: string): Promise<{ oneLiner: string; sections: Section[] }> {
		// 무료에서 약속한 마무리 제목 (있으면 사용)
		const title10 = closingTitle || `${name}님에게 전하는 말`;

		const response = await client.messages.create({
			model: 'claude-sonnet-4-5-20250929',
			max_tokens: 2048,
			system,
			messages: [{
				role: 'user',
				content: `${context}

## 작성할 내용
1. oneLiner: 이 사람을 시적으로 표현한 한 줄 (15자 내외)
2. 섹션 10: "${title10}" - 따뜻한 마무리 (2-3문단)

⚠️ 중복 방지: 이 파트는 "마무리" 영역입니다.
- 성격 분석, 강점/약점, 고민 분석, 조언을 다시 요약하지 마세요.
- 앞 내용을 전제로 하되, 새로운 관점의 따뜻한 응원과 격려만 담으세요.`
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
		if (!toolUse || toolUse.type !== 'tool_use') {
			console.error('Part 3 no tool_use found');
			throw new Error('Part 3 failed: no tool_use');
		}

		const input = toolUse.input as Record<string, unknown>;
		let oneLiner = input.oneLiner as string | undefined;
		let sections: Section[];

		// oneLiner 처리
		if (typeof oneLiner !== 'string') {
			console.error('Part 3 missing oneLiner');
			throw new Error('Part 3 failed: missing oneLiner');
		}

		// sections 처리
		try {
			let rawSections = input.sections;
			if (typeof rawSections === 'string') {
				rawSections = JSON.parse(rawSections);
			}
			if (!Array.isArray(rawSections)) {
				throw new Error('sections is not an array');
			}
			sections = rawSections as Section[];
		} catch (e) {
			console.error('Part 3 parse error:', e, 'input:', JSON.stringify(toolUse.input));
			throw new Error('Part 3 failed: ' + (e as Error).message);
		}

		return { oneLiner, sections };
	}
}

export const claudeProvider = new ClaudeProvider();
