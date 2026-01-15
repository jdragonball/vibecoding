import Anthropic from '@anthropic-ai/sdk';
import { CLAUDE_API_KEY } from '$env/static/private';
import type { SajuData, User, ChatMessage } from '../db/schema';
import { calculateSaju } from '../saju/calculator';
import { analyzeSaju, type AnalysisResult } from '../saju/analysis';
import { analyzeLuck, generateLuckContextForAI } from '../saju/luck';
import { solarTermSeries } from '../saju/astro';
import { ELEMENT_KO } from '../saju/ganji';

// Claude 클라이언트 초기화
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: CLAUDE_API_KEY
    });
  }
  return client;
}

// ============ 정적 시스템 프롬프트 (캐시 대상) ============
const STATIC_SYSTEM_PROMPT = `당신은 "사주몽"이라는 이름의 사주 전문 상담사입니다. 사용자의 친근한 친구이자 믿음직한 사주 전문가입니다.

[역할과 성격]
- 전문적이면서도 친근한 사주 상담사
- 한국 전통 명리학에 기반한 정확한 해석 제공
- 사용자의 고민을 진심으로 들어주는 따뜻한 친구
- 현실적이면서도 희망적인 조언을 해주는 조언자

[사주 해석 가이드라인]
1. 일간(日干)을 중심으로 사주를 해석합니다
2. 오행의 균형과 상생상극 관계를 분석합니다
3. 년주는 조상/어린시절, 월주는 부모/청년기, 일주는 본인/중년기, 시주는 자녀/말년을 의미합니다
4. 사주는 참고일 뿐, 노력과 선택이 더 중요함을 강조합니다

[십성(十星) 해석]
- 비견/겁재: 형제, 친구, 경쟁자
- 식신/상관: 표현력, 재능, 자녀
- 편재/정재: 재물, 아버지
- 편관/정관: 직장, 명예, 남편(여성의 경우)
- 편인/정인: 학문, 어머니

[대화 스타일]
- 친한 친구처럼 편한 반말 사용 (~야, ~어, ~지, ~ㅋㅋ 등)
- 이모지 사용 금지
- 느낌표(!) 최소화 - 마침표(.)나 물음표(?)로
- **짧고 핵심적인 답변** - 1-2문장, 길어도 3문장
- 친구한테 카톡하듯 가볍게
- 사주 용어는 꼭 필요할 때만

[주의사항]
- 지나치게 부정적인 예언이나 협박성 발언 금지
- 의료/법률 등 전문 영역에 대한 단정적 조언 금지
- 사주는 100% 운명이 아닌 참고 자료임을 명심
- 무속적/미신적 표현 자제
- 너무 딱딱하거나 권위적인 표현 삼가
- 사극 말투 금지 (~하시오, ~이니라, ~하오 등 사용하지 않기)

[대화 범위 - 유연하게 사주로 연결하기]
당신은 사주 전문 상담사입니다. 가능하면 모든 대화를 사주/명리학 관점에서 해석해 도움을 주세요.

**적극적으로 사주로 연결해서 답변할 주제:**
- "배고파" → 오늘 식신(食神)의 기운, 오행에 맞는 행운 음식 추천
- "피곤해" → 오늘의 기운 흐름, 컨디션 관리 조언
- "오늘 뭐 먹을까?" → 오행에 맞는 음식, 행운의 색상/방향
- "심심해" → 오늘 하면 좋은 활동, 행운의 방향
- "이직해도 될까요?" → 직장운, 변동운 분석
- "연애가 안 돼요" → 애정운, 올해의 인연 시기
- "돈이 없어" → 금전운, 재물운 분석
- "친구랑 싸웠어" → 대인관계운, 비겁/인성 분석

**거절해야 할 질문 (사주로 연결 불가능한 것만):**
- 기술 정의 질문: "CPU가 뭐야?", "파이썬 코드 짜줘", "리액트 사용법"
- 학술적 정의: "미적분이 뭐야?", "양자역학 설명해줘"
- AI/챗봇으로서의 질문: "너 뭘로 만들어졌어?", "GPT야?"

거절 시 예시:
"저는 사주 전문 상담사 사주몽이에요! 그건 제 전문 분야가 아니라서요. 대신 오늘 기운이나 운세에 대해 이야기해 볼까요?"

**핵심 원칙: 거절보다는 사주로 연결하는 것을 우선시하세요!**
사용자의 일상적인 말도 사주적 관점에서 해석하면 의미 있는 조언이 될 수 있습니다.`;

// 분석 결과를 문자열로 변환
function formatAnalysisResult(analysis: AnalysisResult): string {
  const { strength, yongshin, relations } = analysis;

  // 신강/신약 정보
  const strengthInfo = `- 신강/신약: ${strength.label} (${strength.isStrong ? '신강' : '신약'})
- 일간 오행: ${ELEMENT_KO[strength.dayElement]}
- 비율: ${(strength.ratio * 100).toFixed(0)}% (지지력 ${strength.support.toFixed(1)} / 억제력 ${strength.suppress.toFixed(1)})
- ${strength.description}`;

  // 용신 정보
  const { roles } = yongshin;
  const yongshinInfo = `- 용신(用神): ${roles.yong.name || '없음'}
- 희신(喜神): ${roles.hee.name || '없음'}
- 기신(忌神): ${roles.ki.name || '없음'}
- 구신(仇神): ${roles.gu.name || '없음'}
- 한신(閑神): ${roles.han.name || '없음'}`;

  // 합충 관계
  const relationParts: string[] = [];
  for (const rel of relations) {
    const pillarsStr = rel.pillars.map(p => `${p.label}(${p.value})`).join('-');
    relationParts.push(`${rel.title}: ${pillarsStr}${rel.elementName ? ` → ${rel.elementName}` : ''}`);
  }

  const relationsInfo = relationParts.length > 0
    ? `\n[합충 관계]\n${relationParts.join('\n')}`
    : '';

  return `${strengthInfo}\n\n[용신 분석]\n${yongshinInfo}${relationsInfo}`;
}

// ============ 동적 컨텍스트 생성 (사용자별, 세션별) ============

interface DynamicContext {
  sajuContext: string;
  summaryContext: string;
  memoryContext: string;
  dateContext: string;
}

// 사주 정보 컨텍스트 생성
function createSajuContext(sajuData: SajuData | null, user: User | null): string {
  if (!sajuData || !user) {
    return '아직 사용자의 사주 정보가 등록되지 않았습니다. 사용자에게 생년월일시를 물어보고 사주를 등록하도록 안내해주세요.';
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
  const analysisText = formatAnalysisResult(analysis);

  // 절기 및 현재 운 분석
  const events = solarTermSeries(user.birthYear);
  const yongshinElement = analysis.yongshin.roles.yong.element || null;
  const kishinElement = analysis.yongshin.roles.ki.element || null;
  const luckAnalysis = analyzeLuck(sajuResult, events, yongshinElement, kishinElement);
  const luckContext = generateLuckContextForAI(luckAnalysis, yongshinElement);

  return `[사용자 사주 정보]
- 이름: ${user.name}
- 생년월일시: ${user.birthYear}년 ${user.birthMonth}월 ${user.birthDay}일 ${user.birthHour}시
- 성별: ${user.gender === 'male' ? '남' : '여'}
- 사주팔자: ${sajuData.yearPillar} ${sajuData.monthPillar} ${sajuData.dayPillar} ${sajuData.hourPillar}
- 일간: ${sajuData.dayPillar[0]} (${ELEMENT_KO[analysis.strength.dayElement]})
- 띠: ${sajuData.animal}띠

[사주 분석]
- 신강/신약: ${analysis.strength.label}
- 용신: ${analysis.yongshin.roles.yong.name || '없음'}
- 기신: ${analysis.yongshin.roles.ki.name || '없음'}

${luckContext}`;
}

// 전체 동적 컨텍스트 생성
function createDynamicContext(
  sajuData: SajuData | null,
  user: User | null,
  summary: string | null = null,
  memories: string[] = []
): string {
  const parts: string[] = [];

  // 사주 정보
  parts.push(createSajuContext(sajuData, user));

  // 이전 대화 요약 (있는 경우)
  if (summary) {
    parts.push(`\n[이전 대화 요약]\n${summary}`);
  }

  // 사용자 메모리 (있는 경우)
  if (memories.length > 0) {
    parts.push(`\n[사용자에 대해 기억하는 것들]\n${memories.map(m => `- ${m}`).join('\n')}`);
  }

  // 오늘 날짜와 현재 시간
  const now = new Date();
  const hour = now.getHours();
  let timeOfDay = '';
  if (hour >= 5 && hour < 9) timeOfDay = '아침';
  else if (hour >= 9 && hour < 12) timeOfDay = '오전';
  else if (hour >= 12 && hour < 14) timeOfDay = '점심';
  else if (hour >= 14 && hour < 18) timeOfDay = '오후';
  else if (hour >= 18 && hour < 21) timeOfDay = '저녁';
  else timeOfDay = '밤';

  parts.push(`\n현재: ${now.toLocaleDateString('ko-KR')} ${now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} (${timeOfDay})`);

  return parts.join('\n');
}

// 대화 기록을 Claude 메시지 형식으로 변환
function formatMessages(chatHistory: ChatMessage[]): Anthropic.MessageParam[] {
  return chatHistory.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
}

// 채팅 응답 생성 옵션
export interface ChatResponseOptions {
  summary?: string | null;      // 이전 대화 요약
  memories?: string[];          // 사용자 메모리
}

// 채팅 응답 생성 (Prompt Caching 적용)
export async function generateChatResponse(
  userMessage: string,
  chatHistory: ChatMessage[],
  sajuData: SajuData | null,
  user: User | null,
  options: ChatResponseOptions = {}
): Promise<string> {
  const client = getClient();

  const { summary = null, memories = [] } = options;

  // 동적 컨텍스트 생성
  const dynamicContext = createDynamicContext(sajuData, user, summary, memories);

  const messages = formatMessages(chatHistory);

  // 현재 사용자 메시지 추가
  messages.push({
    role: 'user',
    content: userMessage
  });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      // Prompt Caching: 정적 프롬프트에 cache_control 적용
      system: [
        {
          type: 'text',
          text: STATIC_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' }  // 5분 캐시
        },
        {
          type: 'text',
          text: dynamicContext
        }
      ],
      messages: messages
    });

    // 캐시 사용량 로깅 (디버깅용)
    if (response.usage) {
      const usage = response.usage as {
        input_tokens: number;
        output_tokens: number;
        cache_creation_input_tokens?: number;
        cache_read_input_tokens?: number;
      };
      if (usage.cache_read_input_tokens && usage.cache_read_input_tokens > 0) {
        console.log(`[Prompt Cache Hit] ${usage.cache_read_input_tokens} tokens cached`);
      }
    }

    // 텍스트 응답 추출
    const textContent = response.content.find(block => block.type === 'text');
    if (textContent && textContent.type === 'text') {
      return textContent.text;
    }

    return '죄송합니다. 응답을 생성하는 데 문제가 발생했습니다.';
  } catch (error) {
    console.error('Claude API 오류:', error);
    throw error;
  }
}

// ============ 스트리밍 채팅 응답 생성 ============

// 스트리밍 응답 생성 (SSE용)
export async function* generateChatResponseStream(
  userMessage: string,
  chatHistory: ChatMessage[],
  sajuData: SajuData | null,
  user: User | null,
  options: ChatResponseOptions = {}
): AsyncGenerator<string, string, unknown> {
  const client = getClient();

  const { summary = null, memories = [] } = options;

  // 동적 컨텍스트 생성
  const dynamicContext = createDynamicContext(sajuData, user, summary, memories);

  const messages = formatMessages(chatHistory);

  // 현재 사용자 메시지 추가
  messages.push({
    role: 'user',
    content: userMessage
  });

  let fullResponse = '';

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: STATIC_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' }
        },
        {
          type: 'text',
          text: dynamicContext
        }
      ],
      messages: messages
    });

    // 스트리밍 이벤트 처리
    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          fullResponse += delta.text;
          yield delta.text;
        }
      }
    }

    return fullResponse;
  } catch (error) {
    console.error('Claude API 스트리밍 오류:', error);
    throw error;
  }
}

// 일일 운세 조언 생성
export async function generateFortuneAdvice(
  sajuData: SajuData,
  todayPillar: string,
  categories: {
    overall: number;
    love: number;
    money: number;
    health: number;
    work: number;
  }
): Promise<string> {
  const client = getClient();

  const prompt = `오늘의 운세 조언을 생성해주세요.

[사용자 사주]
- 사주팔자: ${sajuData.yearPillar} ${sajuData.monthPillar} ${sajuData.dayPillar} ${sajuData.hourPillar}
- 일간: ${sajuData.dayPillar[0]}
- 띠: ${sajuData.animal}띠

[오늘의 일진]
${todayPillar}

[운세 점수]
- 총운: ${categories.overall}점
- 애정운: ${categories.love}점
- 금전운: ${categories.money}점
- 건강운: ${categories.health}점
- 직장/학업운: ${categories.work}점

위 정보를 바탕으로 오늘 하루에 대한 구체적인 조언을 3-4문장으로 작성해주세요.
- 긍정적이고 실용적인 조언
- 오행의 상생상극 관계 반영
- 구체적인 행동 제안 포함`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const textContent = response.content.find(block => block.type === 'text');
    if (textContent && textContent.type === 'text') {
      return textContent.text;
    }

    return '오늘 하루도 좋은 일이 가득하길 바랍니다.';
  } catch (error) {
    console.error('운세 조언 생성 오류:', error);
    return '오늘 하루도 좋은 일이 가득하길 바랍니다.';
  }
}

// ============ 채팅 제목 생성 ============

// AI로 채팅 제목 생성 (Haiku 모델 - 빠르고 저렴)
export async function generateChatTitle(
  userMessage: string,
  assistantResponse: string
): Promise<string> {
  const client = getClient();

  const prompt = `다음 대화의 제목을 한국어로 짧게 만들어주세요.

사용자: ${userMessage.substring(0, 200)}
상담사: ${assistantResponse.substring(0, 200)}

규칙:
- 10자 이내로 핵심만
- 이모지 없이
- 명사형으로 끝내기 (예: "연애운 상담", "이직 고민", "오늘의 운세")

제목:`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 30,
      messages: [{ role: 'user', content: prompt }]
    });

    const textContent = response.content.find(block => block.type === 'text');
    if (textContent && textContent.type === 'text') {
      // 따옴표나 불필요한 문자 제거
      let title = textContent.text.trim().replace(/["']/g, '');
      // 너무 길면 자르기
      if (title.length > 15) {
        title = title.substring(0, 15) + '...';
      }
      return title;
    }

    return userMessage.length > 15 ? userMessage.substring(0, 15) + '...' : userMessage;
  } catch (error) {
    console.error('제목 생성 오류:', error);
    // 실패 시 기존 방식으로 fallback
    return userMessage.length > 15 ? userMessage.substring(0, 15) + '...' : userMessage;
  }
}

// ============ Summarization (대화 요약) ============

// 대화 요약 생성 (Haiku 모델 사용 - 저렴함)
export async function summarizeMessages(messages: ChatMessage[]): Promise<string> {
  const client = getClient();

  if (messages.length === 0) {
    return '';
  }

  // 메시지 포맷팅 (사용자 메시지 위주)
  const formattedMessages = messages
    .map(m => `${m.role === 'user' ? '사용자' : '사주몽'}: ${m.content}`)
    .join('\n\n');

  const prompt = `다음 사주 상담 대화를 3-5문장으로 핵심만 요약해주세요.
요약에 포함할 내용:
- 사용자가 물어본 주요 질문/고민
- 상담사가 제공한 주요 해석/조언
- 대화에서 언급된 중요한 사주 요소 (오행, 용신 등)

대화:
${formattedMessages}

핵심 요약:`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',  // 저렴한 Haiku 모델
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });

    const textContent = response.content.find(block => block.type === 'text');
    if (textContent && textContent.type === 'text') {
      return textContent.text;
    }

    return '';
  } catch (error) {
    console.error('대화 요약 생성 오류:', error);
    return '';
  }
}

// ============ Memory Formation (메모리 추출) ============

export interface ExtractedMemory {
  category: 'preference' | 'concern' | 'personal' | 'context';
  content: string;
}

// 대화에서 기억할 사실 추출 (Haiku 모델 사용)
export async function extractMemories(messages: ChatMessage[]): Promise<ExtractedMemory[]> {
  const client = getClient();

  if (messages.length === 0) {
    return [];
  }

  // 사용자 메시지만 추출
  const userMessages = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join('\n');

  const prompt = `다음 사용자 메시지들에서 장기적으로 기억할 가치가 있는 사실만 추출해주세요.

추출 대상:
- preference: 사용자 선호도 (예: "직장 운이 궁금해요", "연애 얘기는 별로...")
- concern: 현재 고민/걱정 (예: "이직 고민 중", "건강이 안 좋아요")
- personal: 개인 상황/정보 (예: "회사원이에요", "결혼 예정이에요")
- context: 대화 맥락 (예: "지난번에 금전운 물어봤었는데...")

사용자 메시지:
${userMessages}

JSON 배열로 응답해주세요. 기억할 게 없으면 빈 배열 []을 반환하세요.
형식: [{"category": "preference", "content": "직장 운에 관심이 많음"}]

추출된 메모리:`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',  // 저렴한 Haiku 모델
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const textContent = response.content.find(block => block.type === 'text');
    if (textContent && textContent.type === 'text') {
      try {
        // JSON 파싱 시도
        const text = textContent.text.trim();
        // JSON 배열 추출 (텍스트에 다른 내용이 섞여있을 수 있음)
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as ExtractedMemory[];
          return parsed.filter(m =>
            ['preference', 'concern', 'personal', 'context'].includes(m.category) &&
            typeof m.content === 'string' &&
            m.content.length > 0
          );
        }
      } catch {
        console.error('메모리 JSON 파싱 실패:', textContent.text);
      }
    }

    return [];
  } catch (error) {
    console.error('메모리 추출 오류:', error);
    return [];
  }
}
