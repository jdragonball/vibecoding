// 천간 (10개)
export const CHEONGAN = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
export const CHEONGAN_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;

// 지지 (12개)
export const JIJI = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const;
export const JIJI_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

// 오행
export const OHAENG = ['목', '화', '토', '금', '수'] as const;
export const OHAENG_HANJA = ['木', '火', '土', '金', '水'] as const;

// 천간의 오행
export const CHEONGAN_OHAENG: Record<string, string> = {
  '갑': '목', '을': '목',
  '병': '화', '정': '화',
  '무': '토', '기': '토',
  '경': '금', '신': '금',
  '임': '수', '계': '수'
};

// 지지의 오행
export const JIJI_OHAENG: Record<string, string> = {
  '자': '수', '축': '토',
  '인': '목', '묘': '목',
  '진': '토', '사': '화',
  '오': '화', '미': '토',
  '신': '금', '유': '금',
  '술': '토', '해': '수'
};

// 천간의 음양
export const CHEONGAN_EUMYANG: Record<string, '양' | '음'> = {
  '갑': '양', '을': '음',
  '병': '양', '정': '음',
  '무': '양', '기': '음',
  '경': '양', '신': '음',
  '임': '양', '계': '음'
};

// 지지의 음양
export const JIJI_EUMYANG: Record<string, '양' | '음'> = {
  '자': '양', '축': '음',
  '인': '양', '묘': '음',
  '진': '양', '사': '음',
  '오': '양', '미': '음',
  '신': '양', '유': '음',
  '술': '양', '해': '음'
};

// 지지와 시간 매핑 (시작 시간)
export const JIJI_HOUR: Record<string, [number, number]> = {
  '자': [23, 1],   // 23:00 ~ 01:00
  '축': [1, 3],    // 01:00 ~ 03:00
  '인': [3, 5],    // 03:00 ~ 05:00
  '묘': [5, 7],    // 05:00 ~ 07:00
  '진': [7, 9],    // 07:00 ~ 09:00
  '사': [9, 11],   // 09:00 ~ 11:00
  '오': [11, 13],  // 11:00 ~ 13:00
  '미': [13, 15],  // 13:00 ~ 15:00
  '신': [15, 17],  // 15:00 ~ 17:00
  '유': [17, 19],  // 17:00 ~ 19:00
  '술': [19, 21],  // 19:00 ~ 21:00
  '해': [21, 23]   // 21:00 ~ 23:00
};

// 띠 동물
export const ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'] as const;

// 60갑자 생성
export function generate60Ganji(): string[] {
  const result: string[] = [];
  for (let i = 0; i < 60; i++) {
    result.push(CHEONGAN[i % 10] + JIJI[i % 12]);
  }
  return result;
}

export const SIXTY_GANJI = generate60Ganji();

// 절기 정보 (대략적인 날짜 - 실제로는 매년 다름)
export const JEOLGI = [
  { name: '입춘', month: 2, day: 4 },
  { name: '우수', month: 2, day: 19 },
  { name: '경칩', month: 3, day: 6 },
  { name: '춘분', month: 3, day: 21 },
  { name: '청명', month: 4, day: 5 },
  { name: '곡우', month: 4, day: 20 },
  { name: '입하', month: 5, day: 6 },
  { name: '소만', month: 5, day: 21 },
  { name: '망종', month: 6, day: 6 },
  { name: '하지', month: 6, day: 21 },
  { name: '소서', month: 7, day: 7 },
  { name: '대서', month: 7, day: 23 },
  { name: '입추', month: 8, day: 8 },
  { name: '처서', month: 8, day: 23 },
  { name: '백로', month: 9, day: 8 },
  { name: '추분', month: 9, day: 23 },
  { name: '한로', month: 10, day: 8 },
  { name: '상강', month: 10, day: 24 },
  { name: '입동', month: 11, day: 8 },
  { name: '소설', month: 11, day: 22 },
  { name: '대설', month: 12, day: 7 },
  { name: '동지', month: 12, day: 22 },
  { name: '소한', month: 1, day: 6 },
  { name: '대한', month: 1, day: 20 }
] as const;
