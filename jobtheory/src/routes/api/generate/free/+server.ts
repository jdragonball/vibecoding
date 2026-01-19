import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { calculateSaju } from '$lib/saju';
import { geminiProvider } from '$lib/models';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { name, birthdate, birthHour, gender, mbti, concern } = body;

		const saju = calculateSaju(birthdate, birthHour, gender);

		const result = await geminiProvider.generateFreeReport({
			name,
			gender,
			mbti,
			saju,
			concern: concern || ''
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
				report: result
			}
		});

	} catch (error) {
		console.error('Free API Error:', error);
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};
