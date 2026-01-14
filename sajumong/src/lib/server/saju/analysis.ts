// 사주 분석 모듈 (신강/신약, 용신, 관계 분석)

import {
  type Element,
  ELEMENT_LABELS,
  ELEMENT_NAMES,
  ELEMENT_KO,
  ELEMENT_SHENG,
  ELEMENT_KE,
  ELEMENT_SHENG_REVERSE,
  ELEMENT_KE_REVERSE,
  getStemElement,
  getBranchElement,
  getDominantBranchElement,
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES
} from './ganji';

import type { SajuResult, Pillar } from './calculator';

// 오행 분포
export interface ElementDistribution {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
}

// 신강/신약 정보
export interface StrengthInfo {
  ratio: number;
  label: string;
  description: string;
  support: number;
  suppress: number;
  monthElement: Element | null;
  dayElement: Element;
  isStrong: boolean;
}

// 용신 역할
export interface ElementRole {
  element: Element | null;
  label: string;
  name: string;
}

// 용신 정보
export interface YongshinInfo {
  kind: string;
  strengthLabel: string;
  roles: {
    yong: ElementRole;  // 용신
    hee: ElementRole;   // 희신
    ki: ElementRole;    // 기신
    gu: ElementRole;    // 구신
    han: ElementRole;   // 한신
  };
}

// 관계 발견
export interface RelationFinding {
  category: string;
  title: string;
  description: string;
  element: Element | null;
  elementLabel: string;
  elementName: string;
  pillars: Array<{
    key: string;
    label: string;
    value: string;
    kind: 'stem' | 'branch';
  }>;
}

// 분석 결과
export interface AnalysisResult {
  elements: ElementDistribution;
  strength: StrengthInfo;
  yongshin: YongshinInfo;
  relations: RelationFinding[];
}

// 신강/신약 단계 정의
const STRENGTH_STATES = [
  { label: '극약', max: 0.20, description: '기운이 거의 없어 외부 보조가 필수입니다.' },
  { label: '태약', max: 0.35, description: '매우 약한 편으로 생조가 최우선입니다.' },
  { label: '신약', max: 0.45, description: '약간 부족하여 인성/비겁으로 보강해야 합니다.' },
  { label: '중화신약', max: 0.50, description: '약간 약한 편이지만 균형에 근접합니다.' },
  { label: '중화신강', max: 0.60, description: '약간 강한 편으로 억제가 필요할 수 있습니다.' },
  { label: '신강', max: 0.70, description: '상당히 강한 편이라 관성/재성의 제어가 중요합니다.' },
  { label: '태강', max: 0.85, description: '매우 강해 누르는 기운 위주로 사용합니다.' },
  { label: '극왕', max: 1.00, description: '극단적으로 강하여 억제/설기 위주의 처방이 필요합니다.' }
];

// 천간합 정의
const HEAVENLY_COMBOS: Array<{
  pair: [string, string];
  element: Element;
  label: string;
  description: string;
}> = [
  { pair: ['甲', '己'], element: 'earth', label: '갑기합토', description: '중정지합 · 바름과 현실성' },
  { pair: ['乙', '庚'], element: 'metal', label: '을경합금', description: '인의지합 · 결단과 도덕' },
  { pair: ['丙', '辛'], element: 'water', label: '병신합수', description: '위엄지합 · 냉정과 통찰' },
  { pair: ['丁', '壬'], element: 'wood', label: '정임합목', description: '음란지합 · 감성 융합' },
  { pair: ['戊', '癸'], element: 'fire', label: '무계합화', description: '무정지합 · 추진력과 열정' }
];

// 천간충 정의
const HEAVENLY_CLASHES: Array<{
  pair: [string, string];
  label: string;
  description: string;
}> = [
  { pair: ['甲', '庚'], label: '갑경충', description: '의지 충돌, 방향 전환' },
  { pair: ['乙', '辛'], label: '을신충', description: '가치관 충돌, 결단 요구' },
  { pair: ['丙', '壬'], label: '병임충', description: '열정과 이성의 충돌' },
  { pair: ['丁', '癸'], label: '정계충', description: '감정과 이성의 갈등' }
];

// 지지육합 정의
const EARTHLY_SIX_COMBOS: Array<{
  pair: [string, string];
  label: string;
  description: string;
}> = [
  { pair: ['子', '丑'], label: '자축합', description: '극합 · 현실적 묶임' },
  { pair: ['寅', '亥'], label: '인해합', description: '생합 · 이상과 실행의 결속' },
  { pair: ['卯', '戌'], label: '묘술합', description: '극합 · 협업과 종교성' },
  { pair: ['辰', '酉'], label: '진유합', description: '생합 · 금기운 결속' },
  { pair: ['巳', '申'], label: '사신합', description: '극합 · 전략과 실무' },
  { pair: ['午', '未'], label: '오미합', description: '생합 · 휴식과 재정비' }
];

// 지지충 정의
const EARTHLY_CLASHES: Array<{
  pair: [string, string];
  label: string;
  description: string;
}> = [
  { pair: ['子', '午'], label: '자오충', description: '이동, 감정 대립' },
  { pair: ['丑', '未'], label: '축미충', description: '현실 갈등, 정착 문제' },
  { pair: ['寅', '申'], label: '인신충', description: '진로·권한 충돌' },
  { pair: ['卯', '酉'], label: '묘유충', description: '인맥·표현 충돌' },
  { pair: ['辰', '戌'], label: '진술충', description: '관계 청산, 제도 충돌' },
  { pair: ['巳', '亥'], label: '사해충', description: '기밀 노출, 건강 주의' }
];

// 삼합 정의
const EARTHLY_TRIADS: Array<{
  members: [string, string, string];
  center: string;
  element: Element;
  label: string;
  description: string;
}> = [
  { members: ['申', '子', '辰'], center: '子', element: 'water', label: '신자진 수국', description: '지혜·기획의 수(水)국' },
  { members: ['寅', '午', '戌'], center: '午', element: 'fire', label: '인오술 화국', description: '열정·리더십의 화(火)국' },
  { members: ['巳', '酉', '丑'], center: '酉', element: 'metal', label: '사유축 금국', description: '결단·실행의 금(金)국' },
  { members: ['亥', '卯', '未'], center: '卯', element: 'wood', label: '해묘미 목국', description: '성장·창조의 목(木)국' }
];

const PILLAR_ORDER = ['hour', 'day', 'month', 'year'] as const;
const PILLAR_LABELS: Record<string, string> = {
  hour: '시주',
  day: '일주',
  month: '월주',
  year: '연주'
};

interface PillarStats {
  key: string;
  label: string;
  stemIndex: number;
  branchIndex: number;
  stemChar: string;
  branchChar: string;
}

function collectPillarStats(saju: SajuResult): PillarStats[] {
  const data: Record<string, Pillar> = {
    hour: saju.hourPillar,
    day: saju.dayPillar,
    month: saju.monthPillar,
    year: saju.yearPillar
  };

  return PILLAR_ORDER.map(key => ({
    key,
    label: PILLAR_LABELS[key],
    stemIndex: data[key].stemIndex,
    branchIndex: data[key].branchIndex,
    stemChar: data[key].stem,
    branchChar: data[key].branch
  }));
}

function countElements(stats: PillarStats[]): Record<Element, number> {
  const counts: Record<Element, number> = {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0
  };

  for (const p of stats) {
    const stemElem = getStemElement(p.stemIndex);
    const branchElem = getBranchElement(p.branchIndex);
    counts[stemElem]++;
    counts[branchElem]++;
  }

  return counts;
}

function classifyStrength(ratio: number): { label: string; description: string } {
  const r = Math.max(0, Math.min(1, ratio));
  for (const state of STRENGTH_STATES) {
    if (r <= state.max) {
      return { label: state.label, description: state.description };
    }
  }
  const last = STRENGTH_STATES[STRENGTH_STATES.length - 1];
  return { label: last.label, description: last.description };
}

function evaluateStrength(stats: PillarStats[], counts: Record<Element, number>): StrengthInfo {
  const dayInfo = stats.find(p => p.key === 'day')!;
  const monthInfo = stats.find(p => p.key === 'month')!;

  const dayElement = getStemElement(dayInfo.stemIndex);
  const monthElement = getDominantBranchElement(monthInfo.branchIndex);

  const resourceElement = ELEMENT_SHENG_REVERSE[dayElement];
  const outputElement = ELEMENT_SHENG[dayElement];
  const wealthElement = ELEMENT_KE[dayElement];
  const officerElement = ELEMENT_KE_REVERSE[dayElement];

  let supportive = counts[dayElement] + counts[resourceElement];
  let suppressive = counts[officerElement] + counts[wealthElement] + counts[outputElement];

  // 월령 보너스/페널티
  let seasonBoost = 0;
  if (monthElement === dayElement) seasonBoost += 1.5;
  if (monthElement === resourceElement) seasonBoost += 1.0;

  let seasonDrain = 0;
  if (monthElement === officerElement) seasonDrain += 1.5;
  if (monthElement === wealthElement) seasonDrain += 1.0;
  if (monthElement === outputElement) seasonDrain += 0.5;

  const totalSupport = supportive + seasonBoost;
  const totalSuppress = suppressive + seasonDrain;
  const ratio = totalSupport + totalSuppress > 0
    ? totalSupport / (totalSupport + totalSuppress)
    : 0.5;

  const classification = classifyStrength(ratio);
  const isStrong = ratio >= 0.55;

  return {
    ratio,
    label: classification.label,
    description: classification.description,
    support: totalSupport,
    suppress: totalSuppress,
    monthElement,
    dayElement,
    isStrong
  };
}

function buildElementRole(element: Element | null): ElementRole {
  if (!element) {
    return { element: null, label: '', name: '' };
  }
  return {
    element,
    label: ELEMENT_LABELS[element],
    name: ELEMENT_NAMES[element]
  };
}

function determineYongshin(strength: StrengthInfo, counts: Record<Element, number>): YongshinInfo {
  if (!strength.dayElement) {
    return {
      kind: '',
      strengthLabel: '',
      roles: {
        yong: buildElementRole(null),
        hee: buildElementRole(null),
        ki: buildElementRole(null),
        gu: buildElementRole(null),
        han: buildElementRole(null)
      }
    };
  }

  const resourceElement = ELEMENT_SHENG_REVERSE[strength.dayElement];
  const outputElement = ELEMENT_SHENG[strength.dayElement];
  const wealthElement = ELEMENT_KE[strength.dayElement];
  const officerElement = ELEMENT_KE_REVERSE[strength.dayElement];

  let yongElement: Element;

  if (strength.isStrong) {
    // 신강: 관성, 재성, 식상 순으로 용신
    yongElement = officerElement || wealthElement || outputElement || strength.dayElement;
  } else {
    // 신약: 비겁 또는 인성 용신
    const dayCount = counts[strength.dayElement];
    const resourceCount = counts[resourceElement];
    if (dayCount <= resourceCount) {
      yongElement = strength.dayElement;
    } else {
      yongElement = resourceElement;
    }
  }

  const heeElement = ELEMENT_SHENG_REVERSE[yongElement] || yongElement;
  const kiElement = ELEMENT_KE_REVERSE[yongElement];
  const guElement = kiElement ? ELEMENT_SHENG_REVERSE[kiElement] : null;
  const hanElement = ELEMENT_SHENG[yongElement];

  const kind = strength.isStrong ? '신강 억부용신' : '신약 억부용신';

  return {
    kind,
    strengthLabel: strength.label,
    roles: {
      yong: buildElementRole(yongElement),
      hee: buildElementRole(heeElement),
      ki: buildElementRole(kiElement || null),
      gu: buildElementRole(guElement || null),
      han: buildElementRole(hanElement || null)
    }
  };
}

// 관계 매칭 헬퍼
function buildRelationMap<T extends { pair: [string, string] }>(defs: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const def of defs) {
    map.set(def.pair[0] + def.pair[1], def);
    map.set(def.pair[1] + def.pair[0], def);
  }
  return map;
}

const heavenlyComboMap = buildRelationMap(HEAVENLY_COMBOS);
const heavenlyClashMap = buildRelationMap(HEAVENLY_CLASHES);
const earthlySixComboMap = buildRelationMap(EARTHLY_SIX_COMBOS);
const earthlyClashMap = buildRelationMap(EARTHLY_CLASHES);

function detectPairRelations<T extends { label: string; description: string; element?: Element }>(
  stats: PillarStats[],
  useStem: boolean,
  relMap: Map<string, T>,
  category: string
): RelationFinding[] {
  const results: RelationFinding[] = [];

  for (let i = 0; i < stats.length; i++) {
    for (let j = i + 1; j < stats.length; j++) {
      const a = useStem ? stats[i].stemChar : stats[i].branchChar;
      const b = useStem ? stats[j].stemChar : stats[j].branchChar;
      if (!a || !b) continue;

      const rel = relMap.get(a + b);
      if (!rel) continue;

      const element = (rel as { element?: Element }).element || null;
      results.push({
        category,
        title: rel.label,
        description: rel.description,
        element,
        elementLabel: element ? ELEMENT_LABELS[element] : '',
        elementName: element ? ELEMENT_NAMES[element] : '',
        pillars: [
          { key: stats[i].key, label: stats[i].label, value: useStem ? stats[i].stemChar : stats[i].branchChar, kind: useStem ? 'stem' : 'branch' },
          { key: stats[j].key, label: stats[j].label, value: useStem ? stats[j].stemChar : stats[j].branchChar, kind: useStem ? 'stem' : 'branch' }
        ]
      });
    }
  }

  return results;
}

function detectTriadRelations(stats: PillarStats[]): RelationFinding[] {
  const branchMap = new Map<string, PillarStats>();
  for (const p of stats) {
    branchMap.set(p.branchChar, p);
  }

  const results: RelationFinding[] = [];
  const monthInfo = stats.find(p => p.key === 'month');

  for (const triad of EARTHLY_TRIADS) {
    const present: PillarStats[] = [];
    for (const member of triad.members) {
      const info = branchMap.get(member);
      if (info) present.push(info);
    }

    if (present.length === 3) {
      results.push({
        category: '지지',
        title: triad.label,
        description: triad.description,
        element: triad.element,
        elementLabel: ELEMENT_LABELS[triad.element],
        elementName: ELEMENT_NAMES[triad.element],
        pillars: present.map(p => ({
          key: p.key,
          label: p.label,
          value: p.branchChar,
          kind: 'branch' as const
        }))
      });
      continue;
    }

    // 반합 체크
    if (present.length === 2 && monthInfo?.branchChar === triad.center) {
      results.push({
        category: '지지',
        title: triad.label + ' 반합',
        description: '월령을 중심으로 합의 기운이 형성됩니다.',
        element: triad.element,
        elementLabel: ELEMENT_LABELS[triad.element],
        elementName: ELEMENT_NAMES[triad.element],
        pillars: [...present, monthInfo].map(p => ({
          key: p.key,
          label: p.label,
          value: p.branchChar,
          kind: 'branch' as const
        }))
      });
    }
  }

  return results;
}

function detectAllRelations(stats: PillarStats[]): RelationFinding[] {
  const findings: RelationFinding[] = [];

  // 천간합
  findings.push(...detectPairRelations(stats, true, heavenlyComboMap, '천간'));
  // 천간충
  findings.push(...detectPairRelations(stats, true, heavenlyClashMap, '천간'));
  // 지지육합
  findings.push(...detectPairRelations(stats, false, earthlySixComboMap, '지지'));
  // 지지충
  findings.push(...detectPairRelations(stats, false, earthlyClashMap, '지지'));
  // 삼합
  findings.push(...detectTriadRelations(stats));

  return findings.sort((a, b) => {
    if (a.category === b.category) return a.title.localeCompare(b.title);
    return a.category.localeCompare(b.category);
  });
}

// 메인 분석 함수
export function analyzeSaju(saju: SajuResult): AnalysisResult {
  const stats = collectPillarStats(saju);
  const countMap = countElements(stats);

  const elements: ElementDistribution = {
    wood: countMap.wood,
    fire: countMap.fire,
    earth: countMap.earth,
    metal: countMap.metal,
    water: countMap.water
  };

  const strength = evaluateStrength(stats, countMap);
  const yongshin = determineYongshin(strength, countMap);
  const relations = detectAllRelations(stats);

  return {
    elements,
    strength,
    yongshin,
    relations
  };
}

// 분석 요약 생성
export function generateAnalysisSummary(analysis: AnalysisResult): string {
  const { strength, yongshin, relations, elements } = analysis;

  let summary = `
[신강/신약 분석]
일간 오행: ${ELEMENT_NAMES[strength.dayElement]}
월령 주기: ${strength.monthElement ? ELEMENT_NAMES[strength.monthElement] : '없음'}
강약 판정: ${strength.label}
설명: ${strength.description}

[용신 분석]
용신 유형: ${yongshin.kind}
용신(用神): ${yongshin.roles.yong.name || '없음'}
희신(喜神): ${yongshin.roles.hee.name || '없음'}
기신(忌神): ${yongshin.roles.ki.name || '없음'}
구신(仇神): ${yongshin.roles.gu.name || '없음'}
한신(閑神): ${yongshin.roles.han.name || '없음'}

[오행 분포]
목(木): ${elements.wood}개
화(火): ${elements.fire}개
토(土): ${elements.earth}개
금(金): ${elements.metal}개
수(水): ${elements.water}개
`;

  if (relations.length > 0) {
    summary += '\n[합충 관계]\n';
    for (const rel of relations) {
      summary += `- ${rel.title}: ${rel.description}\n`;
    }
  }

  return summary.trim();
}
