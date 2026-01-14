import Anthropic from '@anthropic-ai/sdk';
import { CLAUDE_API_KEY } from '$env/static/private';
import type { SajuData } from '../db/schema';
import type { ChatMessage } from '../db/schema';

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

// 사주 전문가 시스템 프롬프트
function createSystemPrompt(sajuData: SajuData | null, userName: string): string {
  const sajuContext = sajuData
    ? `
[사용자 사주 정보]
- 이름: ${userName}
- 사주팔자: ${sajuData.yearPillar} ${sajuData.monthPillar} ${sajuData.dayPillar} ${sajuData.hourPillar}
- 년주(年柱): ${sajuData.yearPillar}
- 월주(月柱): ${sajuData.monthPillar}
- 일주(日柱): ${sajuData.dayPillar} (일간: ${sajuData.dayPillar[0]})
- 시주(時柱): ${sajuData.hourPillar}
- 띠: ${sajuData.animal}띠
- 오행 분포: ${sajuData.ohaengCount}
`
    : '아직 사용자의 사주 정보가 등록되지 않았습니다. 사용자에게 생년월일시를 물어보고 사주를 등록하도록 안내해주세요.';

  return `당신은 "사주몽"이라는 이름의 사주 전문 상담사입니다. 사용자의 친근한 친구이자 믿음직한 사주 전문가입니다.

[역할과 성격]
- 전문적이면서도 친근한 사주 상담사
- 한국 전통 명리학에 기반한 정확한 해석 제공
- 사용자의 고민을 진심으로 들어주는 따뜻한 친구
- 현실적이면서도 희망적인 조언을 해주는 조언자

${sajuContext}

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
- 편안한 존댓말 사용 (~요, ~네요, ~세요 등 현대적 표현)
- 이모지는 최소한으로만 사용 (문장 끝에 1개 정도)
- 간결하고 읽기 쉬운 답변 (2-3 문단)
- 사주 용어 사용 시 쉽게 풀어서 설명
- 전문가답게 신뢰감 있으면서도 부담스럽지 않은 톤
- 상담자의 감정에 공감하며 대화

[주의사항]
- 지나치게 부정적인 예언이나 협박성 발언 금지
- 의료/법률 등 전문 영역에 대한 단정적 조언 금지
- 사주는 100% 운명이 아닌 참고 자료임을 명심
- 무속적/미신적 표현 자제
- 너무 딱딱하거나 권위적인 표현 삼가
- 사극 말투 금지 (~하시오, ~이니라, ~하오 등 사용하지 않기)

오늘 날짜: ${new Date().toLocaleDateString('ko-KR')}`;
}

// 대화 기록을 Claude 메시지 형식으로 변환
function formatMessages(chatHistory: ChatMessage[]): Anthropic.MessageParam[] {
  return chatHistory.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
}

// 채팅 응답 생성
export async function generateChatResponse(
  userMessage: string,
  chatHistory: ChatMessage[],
  sajuData: SajuData | null,
  userName: string
): Promise<string> {
  const client = getClient();

  const systemPrompt = createSystemPrompt(sajuData, userName);
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
      system: systemPrompt,
      messages: messages
    });

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
