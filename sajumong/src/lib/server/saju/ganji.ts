// 천간 (Heavenly Stems)
export const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const HEAVENLY_STEMS_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;

// 지지 (Earthly Branches)
export const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
export const EARTHLY_BRANCHES_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const;

// 띠 동물
export const ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'] as const;

// 오행
export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

export const ELEMENT_LABELS: Record<Element, string> = {
  wood: '木',
  fire: '火',
  earth: '土',
  metal: '金',
  water: '水'
};

export const ELEMENT_NAMES: Record<Element, string> = {
  wood: '목(木)',
  fire: '화(火)',
  earth: '토(土)',
  metal: '금(金)',
  water: '수(水)'
};

export const ELEMENT_KO: Record<Element, string> = {
  wood: '목',
  fire: '화',
  earth: '토',
  metal: '금',
  water: '수'
};

// 천간의 오행
export const STEM_ELEMENTS: Element[] = [
  'wood', 'wood',   // 甲, 乙
  'fire', 'fire',   // 丙, 丁
  'earth', 'earth', // 戊, 己
  'metal', 'metal', // 庚, 辛
  'water', 'water'  // 壬, 癸
];

// 지지의 오행
export const BRANCH_ELEMENTS: Element[] = [
  'water',  // 子
  'earth',  // 丑
  'wood',   // 寅
  'wood',   // 卯
  'earth',  // 辰
  'fire',   // 巳
  'fire',   // 午
  'earth',  // 未
  'metal',  // 申
  'metal',  // 酉
  'earth',  // 戌
  'water'   // 亥
];

// 지장간 (Hidden Stems in Branches)
// 각 지지에 숨어있는 천간들 [stem index, weight percentage]
export const BRANCH_HIDDEN_STEMS: [number, number][][] = [
  [[8, 33], [9, 67]],           // 子: 壬33%, 癸67%
  [[9, 30], [7, 10], [5, 60]],  // 丑: 癸30%, 辛10%, 己60%
  [[4, 23], [2, 23], [0, 54]],  // 寅: 戊23%, 丙23%, 甲54%
  [[0, 33], [1, 67]],           // 卯: 甲33%, 乙67%
  [[1, 30], [9, 10], [4, 60]],  // 辰: 乙30%, 癸10%, 戊60%
  [[4, 23], [6, 23], [2, 54]],  // 巳: 戊23%, 庚23%, 丙54%
  [[2, 33], [5, 30], [3, 37]],  // 午: 丙33%, 己30%, 丁37%
  [[3, 30], [1, 10], [5, 60]],  // 未: 丁30%, 乙10%, 己60%
  [[4, 23], [8, 23], [6, 54]],  // 申: 戊23%, 壬23%, 庚54%
  [[6, 33], [7, 67]],           // 酉: 庚33%, 辛67%
  [[7, 30], [3, 10], [4, 60]],  // 戌: 辛30%, 丁10%, 戊60%
  [[4, 23], [0, 23], [8, 54]]   // 亥: 戊23%, 甲23%, 壬54%
];

// 간지 쌍
export interface StemBranch {
  stemIndex: number;
  branchIndex: number;
}

export function createStemBranch(stem: number, branch: number): StemBranch {
  return {
    stemIndex: ((stem % 10) + 10) % 10,
    branchIndex: ((branch % 12) + 12) % 12
  };
}

export function stemBranchToString(sb: StemBranch): string {
  return HEAVENLY_STEMS[sb.stemIndex] + EARTHLY_BRANCHES[sb.branchIndex];
}

export function stemBranchToKorean(sb: StemBranch): string {
  return HEAVENLY_STEMS_KO[sb.stemIndex] + EARTHLY_BRANCHES_KO[sb.branchIndex];
}

export function stemName(index: number): string {
  return HEAVENLY_STEMS[((index % 10) + 10) % 10];
}

export function branchName(index: number): string {
  return EARTHLY_BRANCHES[((index % 12) + 12) % 12];
}

export function isYangStem(index: number): boolean {
  return index % 2 === 0;
}

export function getStemElement(index: number): Element {
  return STEM_ELEMENTS[((index % 10) + 10) % 10];
}

export function getBranchElement(index: number): Element {
  return BRANCH_ELEMENTS[((index % 12) + 12) % 12];
}

export function getHiddenStems(branchIndex: number): [number, number][] {
  return BRANCH_HIDDEN_STEMS[((branchIndex % 12) + 12) % 12];
}

// 지지의 주 기운 (가장 비중이 높은 지장간의 오행)
export function getDominantBranchElement(branchIndex: number): Element {
  const hiddenStems = getHiddenStems(branchIndex);
  let bestStem = hiddenStems[0];
  for (const stem of hiddenStems) {
    if (stem[1] > bestStem[1]) {
      bestStem = stem;
    }
  }
  return STEM_ELEMENTS[bestStem[0]];
}

// 상생 관계: A가 B를 생함
export const ELEMENT_SHENG: Record<Element, Element> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood'
};

// 상극 관계: A가 B를 극함
export const ELEMENT_KE: Record<Element, Element> = {
  wood: 'earth',
  fire: 'metal',
  earth: 'water',
  metal: 'wood',
  water: 'fire'
};

// 역상생: A를 생하는 오행
export const ELEMENT_SHENG_REVERSE: Record<Element, Element> = {
  wood: 'water',
  fire: 'wood',
  earth: 'fire',
  metal: 'earth',
  water: 'metal'
};

// 역상극: A를 극하는 오행
export const ELEMENT_KE_REVERSE: Record<Element, Element> = {
  wood: 'metal',
  fire: 'water',
  earth: 'wood',
  metal: 'fire',
  water: 'earth'
};
