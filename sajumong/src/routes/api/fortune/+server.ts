import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { calculateSaju, type BirthInfo } from '$lib/server/saju/calculator';
import { generateDailyFortune } from '$lib/server/saju/fortune';
import { generateFortuneAdvice } from '$lib/server/ai/claude';
import { getFirstUser, getSajuDataByUserId, saveDailyFortune, getTodayFortune } from '$lib/server/db/client';

import type { Locale } from '$lib/i18n/types';

// 색상/방향 변환을 위한 매핑
const COLORS_KO_TO_EN: Record<string, string> = {
  '빨강': 'Red', '주황': 'Orange', '노랑': 'Yellow', '초록': 'Green',
  '파랑': 'Blue', '남색': 'Indigo', '보라': 'Purple', '검정': 'Black',
  '흰색': 'White', '분홍': 'Pink'
};

const DIRECTIONS_KO_TO_EN: Record<string, string> = {
  '동': 'East', '서': 'West', '남': 'South', '북': 'North',
  '동북': 'Northeast', '동남': 'Southeast', '서북': 'Northwest', '서남': 'Southwest'
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const locale = (url.searchParams.get('locale') || 'ko') as Locale;

    // 사용자 조회
    const user = getFirstUser();
    if (!user) {
      throw error(404, '사용자 정보가 없습니다. 먼저 사주를 등록해주세요.');
    }

    // 오늘의 운세가 이미 있는지 확인
    const existingFortune = getTodayFortune(user.id);
    if (existingFortune) {
      // 캐시된 운세가 있으면 locale에 맞게 색상/방향 변환
      let luckyColor = existingFortune.luckyColor;
      let luckyDirection = existingFortune.luckyDirection;

      if (locale === 'en') {
        luckyColor = COLORS_KO_TO_EN[luckyColor] || luckyColor;
        luckyDirection = DIRECTIONS_KO_TO_EN[luckyDirection] || luckyDirection;
      }

      return json({
        success: true,
        cached: true,
        fortune: {
          date: existingFortune.fortuneDate,
          todayPillar: existingFortune.todayPillar,
          categories: {
            overall: existingFortune.overallScore,
            love: existingFortune.loveScore,
            money: existingFortune.moneyScore,
            health: existingFortune.healthScore,
            work: existingFortune.workScore
          },
          advice: existingFortune.advice,
          luckyColor,
          luckyNumber: existingFortune.luckyNumber,
          luckyDirection
        }
      });
    }

    // 사주 데이터 조회
    const sajuData = getSajuDataByUserId(user.id);
    if (!sajuData) {
      throw error(404, '사주 정보가 없습니다. 먼저 사주를 등록해주세요.');
    }

    // 사주 다시 계산
    const birthInfo: BirthInfo = {
      year: user.birthYear,
      month: user.birthMonth,
      day: user.birthDay,
      hour: user.birthHour,
      gender: user.gender
    };

    const saju = calculateSaju(birthInfo);

    // 일일 운세 생성 (locale 적용)
    const fortune = generateDailyFortune(saju, locale);

    // Claude AI로 조언 생성 (locale 적용)
    const advice = await generateFortuneAdvice(
      sajuData,
      fortune.todayPillar,
      fortune.categories,
      locale
    );

    fortune.advice = advice;

    // 운세 저장
    saveDailyFortune(user.id, fortune);

    return json({
      success: true,
      cached: false,
      fortune: {
        date: fortune.date,
        todayPillar: fortune.todayPillar,
        categories: fortune.categories,
        description: fortune.description,
        advice: fortune.advice,
        luckyColor: fortune.luckyColor,
        luckyNumber: fortune.luckyNumber,
        luckyDirection: fortune.luckyDirection
      }
    });
  } catch (err) {
    console.error('운세 조회 오류:', err);

    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }

    throw error(500, '서버 오류가 발생했습니다.');
  }
};
