import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { calculateSaju } from '$lib/saju';
import { claudeProvider } from '$lib/models';
import type { FreeReportResult } from '$lib/models/types';

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
		const { name, birthdate, birthHour, gender, mbti, concern, freeContext } = body;

		if (!freeContext) {
			return json({
				success: false,
				error: '무료 리포트 컨텍스트가 필요합니다'
			}, { status: 400 });
		}

		const saju = calculateSaju(birthdate, birthHour, gender);

		const result = await claudeProvider.generatePaidReport(
			{ name, gender, mbti, saju, concern: concern || '' },
			freeContext as FreeReportResult
		);

		// 섹션에 emoji, part 추가
		const sectionsWithEmoji = result.sections.map((section) => {
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
					oneLiner: result.oneLiner,
					sections: sectionsWithEmoji
				}
			}
		});

	} catch (error) {
		console.error('Paid API Error:', error);
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};
