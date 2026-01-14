import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { calculateSaju, generateSajuSummary, type BirthInfo } from '$lib/server/saju/calculator';
import { createUser, getFirstUser, updateUser, saveSajuData, getSajuDataByUserId } from '$lib/server/db/client';

// 사주 정보 조회
export const GET: RequestHandler = async () => {
  try {
    const user = getFirstUser();

    if (!user) {
      return json({
        success: true,
        hasUser: false,
        user: null,
        saju: null
      });
    }

    const sajuData = getSajuDataByUserId(user.id);

    // 사주 다시 계산하여 전체 정보 제공
    const birthInfo: BirthInfo = {
      year: user.birthYear,
      month: user.birthMonth,
      day: user.birthDay,
      hour: user.birthHour,
      gender: user.gender
    };

    const saju = calculateSaju(birthInfo);
    const summary = generateSajuSummary(saju);

    return json({
      success: true,
      hasUser: true,
      user: {
        id: user.id,
        name: user.name,
        birthYear: user.birthYear,
        birthMonth: user.birthMonth,
        birthDay: user.birthDay,
        birthHour: user.birthHour,
        gender: user.gender
      },
      saju: {
        yearPillar: saju.yearPillar.fullName,
        monthPillar: saju.monthPillar.fullName,
        dayPillar: saju.dayPillar.fullName,
        hourPillar: saju.hourPillar.fullName,
        animal: saju.animal,
        ohaengCount: saju.ohaengCount,
        summary: summary
      }
    });
  } catch (err) {
    console.error('사주 조회 오류:', err);
    throw error(500, '서버 오류가 발생했습니다.');
  }
};

// 사주 등록/수정
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, birthYear, birthMonth, birthDay, birthHour, gender } = body;

    // 유효성 검사
    if (!name || typeof name !== 'string') {
      throw error(400, '이름이 필요합니다.');
    }

    if (!birthYear || !birthMonth || !birthDay || birthHour === undefined) {
      throw error(400, '생년월일시가 필요합니다.');
    }

    if (!['male', 'female'].includes(gender)) {
      throw error(400, '성별을 선택해주세요.');
    }

    // 유효한 날짜 범위 검사
    if (birthYear < 1900 || birthYear > new Date().getFullYear()) {
      throw error(400, '유효한 출생년도를 입력해주세요.');
    }

    if (birthMonth < 1 || birthMonth > 12) {
      throw error(400, '유효한 출생월을 입력해주세요.');
    }

    if (birthDay < 1 || birthDay > 31) {
      throw error(400, '유효한 출생일을 입력해주세요.');
    }

    if (birthHour < 0 || birthHour > 23) {
      throw error(400, '유효한 출생시를 입력해주세요 (0-23).');
    }

    // 기존 사용자 확인
    let user = getFirstUser();

    if (user) {
      // 기존 사용자 업데이트
      user = updateUser(user.id, {
        name,
        birthYear,
        birthMonth,
        birthDay,
        birthHour,
        gender
      })!;
    } else {
      // 새 사용자 생성
      user = createUser({
        name,
        birthYear,
        birthMonth,
        birthDay,
        birthHour,
        gender
      });
    }

    // 사주 계산
    const birthInfo: BirthInfo = {
      year: birthYear,
      month: birthMonth,
      day: birthDay,
      hour: birthHour,
      gender
    };

    const saju = calculateSaju(birthInfo);

    // 사주 데이터 저장
    saveSajuData(user.id, saju);

    // 요약 생성
    const summary = generateSajuSummary(saju);

    return json({
      success: true,
      message: '사주가 등록되었습니다.',
      user: {
        id: user.id,
        name: user.name,
        birthYear: user.birthYear,
        birthMonth: user.birthMonth,
        birthDay: user.birthDay,
        birthHour: user.birthHour,
        gender: user.gender
      },
      saju: {
        yearPillar: saju.yearPillar.fullName,
        monthPillar: saju.monthPillar.fullName,
        dayPillar: saju.dayPillar.fullName,
        hourPillar: saju.hourPillar.fullName,
        animal: saju.animal,
        ohaengCount: saju.ohaengCount,
        summary: summary
      }
    });
  } catch (err) {
    console.error('사주 등록 오류:', err);

    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }

    throw error(500, '서버 오류가 발생했습니다.');
  }
};
