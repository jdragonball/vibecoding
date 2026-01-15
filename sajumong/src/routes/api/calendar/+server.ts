import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFirstUser, getSajuDataByUserId } from '$lib/server/db/client';
import { calculateSaju } from '$lib/server/saju/calculator';
import { analyzeSaju } from '$lib/server/saju/analysis';
import { calculateDailyFortune } from '$lib/server/saju/fortune';
import type { Locale } from '$lib/i18n/types';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const locale = (url.searchParams.get('locale') || 'ko') as Locale;

    const user = getFirstUser();
    if (!user) {
      return json({
        success: false,
        message: '사용자 정보가 없습니다.'
      });
    }

    const sajuData = getSajuDataByUserId(user.id);
    if (!sajuData) {
      return json({
        success: false,
        message: '사주 정보가 없습니다.'
      });
    }

    // 쿼리 파라미터에서 연월 가져오기
    const yearParam = url.searchParams.get('year');
    const monthParam = url.searchParams.get('month');

    const now = new Date();
    const year = yearParam ? parseInt(yearParam) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1;

    // 사주 계산
    const sajuResult = calculateSaju({
      year: user.birthYear,
      month: user.birthMonth,
      day: user.birthDay,
      hour: user.birthHour,
      gender: user.gender
    });

    // 해당 월의 모든 날짜에 대한 운세 계산
    const daysInMonth = new Date(year, month, 0).getDate();
    const fortunes: Array<{
      day: number;
      date: string;
      todayPillar: string;
      overallScore: number;
      luckyColor: string;
    }> = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const targetDate = new Date(year, month - 1, day);
      const fortune = calculateDailyFortune(sajuResult, targetDate, locale);

      fortunes.push({
        day,
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        todayPillar: fortune.todayPillar,
        overallScore: fortune.categories.overall,
        luckyColor: fortune.luckyColor
      });
    }

    // 해당 월의 첫 날이 무슨 요일인지
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

    return json({
      success: true,
      calendar: {
        year,
        month,
        firstDayOfWeek,
        daysInMonth,
        fortunes
      }
    });
  } catch (err) {
    console.error('달력 API 오류:', err);
    throw error(500, '서버 오류가 발생했습니다.');
  }
};
