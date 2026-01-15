import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFirstUser, getSajuDataByUserId } from '$lib/server/db/client';
import { calculateSaju } from '$lib/server/saju/calculator';
import { analyzeSaju } from '$lib/server/saju/analysis';
import { ELEMENT_KO, ELEMENT_NAMES } from '$lib/server/saju/ganji';
import { getTodayPillar, calculateFortuneCategories } from '$lib/server/saju/fortune';
import type { Locale } from '$lib/i18n/types';

// 다국어 색상/방향
const COLORS: Record<Locale, string[]> = {
  ko: ['빨강', '주황', '노랑', '초록', '파랑', '남색', '보라', '검정', '흰색', '분홍'],
  en: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Indigo', 'Purple', 'Black', 'White', 'Pink']
};

const DIRECTIONS: Record<Locale, string[]> = {
  ko: ['동', '서', '남', '북', '동북', '동남', '서북', '서남'],
  en: ['East', 'West', 'South', 'North', 'Northeast', 'Southeast', 'Northwest', 'Southwest']
};

// 오행 영어 이름
const ELEMENT_EN: Record<string, string> = {
  '목': 'Wood', '화': 'Fire', '토': 'Earth', '금': 'Metal', '수': 'Water'
};

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

    // 사주 계산 및 분석
    const sajuResult = calculateSaju({
      year: user.birthYear,
      month: user.birthMonth,
      day: user.birthDay,
      hour: user.birthHour,
      gender: user.gender
    });

    const analysis = analyzeSaju(sajuResult);

    // 오늘의 운세
    const todayPillar = getTodayPillar();
    const todayFortune = calculateFortuneCategories(sajuResult);

    // 오늘 날짜
    const today = new Date();
    const seed = today.getDate() + today.getMonth() * 31 + today.getFullYear();
    const colors = COLORS[locale];
    const directions = DIRECTIONS[locale];

    // 오행 이름 변환 함수
    const getElementName = (element: string | null): string | null => {
      if (!element) return null;
      return locale === 'en' ? (ELEMENT_EN[element] || element) : element;
    };

    // 프론트엔드용 데이터 구성
    const dashboard = {
      // 기본 정보
      userName: user.name,
      birthInfo: `${user.birthYear}년 ${user.birthMonth}월 ${user.birthDay}일 ${user.birthHour}시`,
      gender: user.gender === 'male' ? '남' : '여',

      // 사주팔자
      pillars: {
        year: sajuData.yearPillar,
        month: sajuData.monthPillar,
        day: sajuData.dayPillar,
        hour: sajuData.hourPillar
      },
      animal: sajuData.animal,

      // 오행 분포
      elements: {
        wood: analysis.elements.wood,
        fire: analysis.elements.fire,
        earth: analysis.elements.earth,
        metal: analysis.elements.metal,
        water: analysis.elements.water
      },

      // 신강/신약 분석
      strength: {
        ratio: Math.round(analysis.strength.ratio * 100),
        label: analysis.strength.label,
        isStrong: analysis.strength.isStrong,
        description: analysis.strength.description,
        dayElement: ELEMENT_KO[analysis.strength.dayElement],
        dayElementFull: ELEMENT_NAMES[analysis.strength.dayElement],
        support: Math.round(analysis.strength.support * 10) / 10,
        suppress: Math.round(analysis.strength.suppress * 10) / 10
      },

      // 용신 분석
      yongshin: {
        kind: analysis.yongshin.kind,
        roles: {
          yong: {
            element: analysis.yongshin.roles.yong.element ? ELEMENT_KO[analysis.yongshin.roles.yong.element] : null,
            name: analysis.yongshin.roles.yong.name,
            label: analysis.yongshin.roles.yong.label
          },
          hee: {
            element: analysis.yongshin.roles.hee.element ? ELEMENT_KO[analysis.yongshin.roles.hee.element] : null,
            name: analysis.yongshin.roles.hee.name,
            label: analysis.yongshin.roles.hee.label
          },
          ki: {
            element: analysis.yongshin.roles.ki.element ? ELEMENT_KO[analysis.yongshin.roles.ki.element] : null,
            name: analysis.yongshin.roles.ki.name,
            label: analysis.yongshin.roles.ki.label
          },
          gu: {
            element: analysis.yongshin.roles.gu.element ? ELEMENT_KO[analysis.yongshin.roles.gu.element] : null,
            name: analysis.yongshin.roles.gu.name,
            label: analysis.yongshin.roles.gu.label
          },
          han: {
            element: analysis.yongshin.roles.han.element ? ELEMENT_KO[analysis.yongshin.roles.han.element] : null,
            name: analysis.yongshin.roles.han.name,
            label: analysis.yongshin.roles.han.label
          }
        }
      },

      // 합충 관계
      relations: analysis.relations.map(rel => ({
        category: rel.category,
        title: rel.title,
        description: rel.description,
        element: rel.element ? ELEMENT_KO[rel.element] : null,
        elementName: rel.elementName,
        pillars: rel.pillars
      })),

      // 오늘의 운세
      todayFortune: {
        date: today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
        pillar: todayPillar.fullName,
        pillarElement: {
          stem: ELEMENT_KO[todayPillar.stemElement],
          branch: ELEMENT_KO[todayPillar.branchElement]
        },
        scores: {
          overall: todayFortune.overall,
          love: todayFortune.love,
          money: todayFortune.money,
          health: todayFortune.health,
          work: todayFortune.work
        },
        lucky: {
          color: colors[seed % colors.length],
          number: (seed % 9) + 1,
          direction: directions[seed % directions.length]
        },
        // 기운 상태 (0-100 점수 기반)
        mood: getMoodFromScore(todayFortune.overall),
        // 오늘의 조언
        advice: getAdviceFromScore(todayFortune.overall, analysis.strength.isStrong, getElementName(ELEMENT_KO[analysis.yongshin.roles.yong.element || 'wood']) || '')
      }
    };

    function getMoodFromScore(score: number): { level: number; label: string; emoji: string; description: string } {
      if (locale === 'en') {
        if (score >= 85) return { level: 5, label: 'Excellent', emoji: '🌟', description: 'Great energy surrounds you today!' };
        if (score >= 70) return { level: 4, label: 'Good', emoji: '😊', description: 'Positive energy flows through your day.' };
        if (score >= 55) return { level: 3, label: 'Average', emoji: '😌', description: 'A smooth day ahead.' };
        if (score >= 40) return { level: 2, label: 'Caution', emoji: '😐', description: 'Take things easy today.' };
        return { level: 1, label: 'Difficult', emoji: '😔', description: 'Rest and recharge today.' };
      }
      if (score >= 85) return { level: 5, label: '최고', emoji: '🌟', description: '오늘 하루 정말 좋은 기운이 가득해요!' };
      if (score >= 70) return { level: 4, label: '좋음', emoji: '😊', description: '긍정적인 에너지가 느껴지는 하루예요.' };
      if (score >= 55) return { level: 3, label: '보통', emoji: '😌', description: '무난한 하루가 될 거예요.' };
      if (score >= 40) return { level: 2, label: '주의', emoji: '😐', description: '조금 조심하면서 보내세요.' };
      return { level: 1, label: '힘듦', emoji: '😔', description: '오늘은 무리하지 말고 쉬어가세요.' };
    }

    function getAdviceFromScore(score: number, isStrong: boolean, yongElement: string): string {
      const advicesKo = {
        high: [
          `오늘은 ${yongElement}의 기운이 좋으니 적극적으로 움직여보세요.`,
          '좋은 기운을 타고 새로운 도전을 시작하기 좋은 날이에요.',
          '인연운이 좋으니 사람들과의 만남을 즐겨보세요.'
        ],
        medium: [
          '평소처럼 꾸준히 하던 일을 이어가세요.',
          `${yongElement}의 기운을 보충하면 더 좋은 하루가 될 거예요.`,
          '급한 결정보다는 신중하게 생각해보세요.'
        ],
        low: [
          '오늘은 충분한 휴식을 취하는 게 좋겠어요.',
          `${yongElement} 색상의 물건을 가까이 두면 기운 보충에 도움이 돼요.`,
          '무리한 약속이나 계획은 미루는 게 좋겠어요.'
        ]
      };

      const advicesEn = {
        high: [
          `${yongElement} energy is strong today - be proactive and take action.`,
          'Great day to start new challenges and ventures.',
          'Good fortune for relationships - enjoy meeting people.'
        ],
        medium: [
          'Continue with your usual routine steadily.',
          `Supplement your ${yongElement} energy for a better day.`,
          'Think carefully before making quick decisions.'
        ],
        low: [
          'Take time to rest and recharge today.',
          `Keep ${yongElement}-colored items nearby for energy boost.`,
          'Better to postpone demanding plans or commitments.'
        ]
      };

      const advices = locale === 'en' ? advicesEn : advicesKo;
      const category = score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low';
      const seed = new Date().getDate();
      return advices[category][seed % advices[category].length];
    }

    return json({
      success: true,
      dashboard
    });
  } catch (err) {
    console.error('대시보드 API 오류:', err);
    throw error(500, '서버 오류가 발생했습니다.');
  }
};
