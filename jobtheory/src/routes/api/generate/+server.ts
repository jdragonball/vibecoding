import { json } from '@sveltejs/kit';
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';
import { buildSystemPrompt, buildUserPrompt } from '$lib/prompts';

const client = new Anthropic({
	apiKey: ANTHROPIC_API_KEY
});

// 사주 계산 유틸리티
function calculateSaju(birthdate: string, birthHour: string | null, gender: string) {
	const year = parseInt(birthdate.slice(0, 4));
	const month = parseInt(birthdate.slice(4, 6));
	const day = parseInt(birthdate.slice(6, 8));

	const heavenlyStems = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
	const earthlyBranches = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
	const fiveElements: Record<string, string> = {
		갑: '목', 을: '목', 병: '화', 정: '화', 무: '토',
		기: '토', 경: '금', 신: '금', 임: '수', 계: '수'
	};
	const elementMeaning: Record<string, string> = {
		목: '성장과 창의성',
		화: '열정과 표현',
		토: '안정과 신뢰',
		금: '결단과 정의',
		수: '지혜와 유연함'
	};

	// 연주
	const yearStemIndex = (year - 4) % 10;
	const yearBranchIndex = (year - 4) % 12;
	const yearStem = heavenlyStems[yearStemIndex >= 0 ? yearStemIndex : yearStemIndex + 10];
	const yearBranch = earthlyBranches[yearBranchIndex >= 0 ? yearBranchIndex : yearBranchIndex + 12];

	// 월주
	const monthStemIndex = ((year % 10) * 2 + month) % 10;
	const monthBranchIndex = (month + 1) % 12;
	const monthStem = heavenlyStems[monthStemIndex];
	const monthBranch = earthlyBranches[monthBranchIndex];

	// 일주
	const baseDate = new Date(1900, 0, 1);
	const targetDate = new Date(year, month - 1, day);
	const diffDays = Math.floor((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
	const dayStemIndex = (diffDays + 10) % 10;
	const dayBranchIndex = (diffDays + 10) % 12;
	const dayStem = heavenlyStems[dayStemIndex];
	const dayBranch = earthlyBranches[dayBranchIndex];

	// 시주
	let hourStem = '';
	let hourBranch = '';
	if (birthHour) {
		const hourMap: Record<string, number> = {
			'23-01': 0, '01-03': 1, '03-05': 2, '05-07': 3,
			'07-09': 4, '09-11': 5, '11-13': 6, '13-15': 7,
			'15-17': 8, '17-19': 9, '19-21': 10, '21-23': 11
		};
		const hourBranchIndex = hourMap[birthHour];
		hourBranch = earthlyBranches[hourBranchIndex];
		const hourStemIndex = (dayStemIndex * 2 + hourBranchIndex) % 10;
		hourStem = heavenlyStems[hourStemIndex];
	}

	const dayMaster = dayStem;
	const dayMasterElement = fiveElements[dayMaster];
	const dayMasterMeaning = elementMeaning[dayMasterElement];

	// 오행 분포
	const allStems = [yearStem, monthStem, dayStem];
	const allBranches = [yearBranch, monthBranch, dayBranch];
	if (hourStem) allStems.push(hourStem);
	if (hourBranch) allBranches.push(hourBranch);

	const elementCount: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
	allStems.forEach(stem => elementCount[fiveElements[stem]]++);

	const branchElements: Record<string, string> = {
		자: '수', 축: '토', 인: '목', 묘: '목', 진: '토', 사: '화',
		오: '화', 미: '토', 신: '금', 유: '금', 술: '토', 해: '수'
	};
	allBranches.forEach(branch => elementCount[branchElements[branch]]++);

	// 강한/약한 오행 분석
	const sortedElements = Object.entries(elementCount).sort((a, b) => b[1] - a[1]);
	const strongElement = sortedElements[0][0];
	const weakElement = sortedElements[sortedElements.length - 1][0];

	return {
		yearPillar: `${yearStem}${yearBranch}`,
		monthPillar: `${monthStem}${monthBranch}`,
		dayPillar: `${dayStem}${dayBranch}`,
		hourPillar: hourStem ? `${hourStem}${hourBranch}` : '시간 미상',
		dayMaster,
		dayMasterElement,
		dayMasterMeaning,
		elementCount,
		strongElement,
		weakElement,
		gender
	};
}

// 고정 프레임워크 (10개 섹션)
const FIXED_FRAMEWORK = [
	{ slot: 1, part: 1, fixedTitle: '{name}님은 이런 사람이에요', emoji: '◐', type: 'intro' },
	{ slot: 2, part: 1, fixedTitle: '사주로 본 나의 기본 에너지', emoji: '☯', type: 'saju-core' },
	{ slot: 3, part: 1, fixedTitle: 'MBTI로 본 나의 행동 방식', emoji: '◈', type: 'mbti-style' },
	{ slot: 4, part: 1, fixedTitle: '타고난 재능과 잘하는 것', emoji: '✦', type: 'strength' },
	{ slot: 5, part: 1, fixedTitle: '주의해야 할 부분', emoji: '○', type: 'weakness' },
	{ slot: 6, part: 2, fixedTitle: null, emoji: '◇', type: 'concern-root', dynamic: true },
	{ slot: 7, part: 2, fixedTitle: null, emoji: '◎', type: 'timing', dynamic: true },
	{ slot: 8, part: 2, fixedTitle: null, emoji: '◆', type: 'core-advice', dynamic: true },
	{ slot: 9, part: 3, fixedTitle: null, emoji: '▸', type: 'action', dynamic: true },
	{ slot: 10, part: 3, fixedTitle: '{name}님에게 전하는 말', emoji: '❋', type: 'closing' }
];

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { name, birthdate, birthHour, gender, mbti, concern } = body;

		const saju = calculateSaju(birthdate, birthHour, gender);

		const systemPrompt = buildSystemPrompt(saju, mbti, name);
		const userPrompt = buildUserPrompt({
			name,
			gender,
			mbti,
			saju: {
				yearPillar: saju.yearPillar,
				monthPillar: saju.monthPillar,
				dayPillar: saju.dayPillar,
				hourPillar: saju.hourPillar,
				dayMaster: saju.dayMaster,
				dayMasterElement: saju.dayMasterElement,
				dayMasterMeaning: saju.dayMasterMeaning
			},
			concern
		});

		const response = await client.messages.create({
			model: 'claude-sonnet-4-5-20250929',
			max_tokens: 8192,
			messages: [{ role: 'user', content: userPrompt }],
			system: systemPrompt
		});

		const content = response.content[0];
		if (content.type !== 'text') {
			throw new Error('Unexpected response type');
		}

		let reportData;
		try {
			const jsonMatch = content.text.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				reportData = JSON.parse(jsonMatch[0]);
			} else {
				throw new Error('No JSON found');
			}
		} catch (parseError) {
			console.error('JSON Parse Error:', parseError);
			console.error('Raw response:', content.text);
			throw new Error('Failed to parse AI response');
		}

		// 섹션에 emoji 추가
		const sectionsWithEmoji = reportData.sections.map((section: { slot: number; title: string; content: string }) => {
			const framework = FIXED_FRAMEWORK.find(f => f.slot === section.slot);
			return {
				...section,
				id: `section-${section.slot}`,
				emoji: framework?.emoji || '◎',
				part: framework?.part || 1
			};
		});

		return json({
			success: true,
			data: {
				name,
				mbti,
				saju: {
					yearPillar: saju.yearPillar,
					monthPillar: saju.monthPillar,
					dayPillar: saju.dayPillar,
					hourPillar: saju.hourPillar,
					dayMaster: saju.dayMaster,
					dayMasterElement: saju.dayMasterElement,
					dayMasterMeaning: saju.dayMasterMeaning
				},
				report: {
					oneLiner: reportData.oneLiner,
					sections: sectionsWithEmoji
				}
			}
		});

	} catch (error) {
		console.error('API Error:', error);
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};
