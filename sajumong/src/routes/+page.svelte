<script lang="ts">
  import { onMount } from 'svelte';
  import { marked } from 'marked';
  import {
    ChatCircle,
    ChartBar,
    Calendar,
    Sparkle,
    ClipboardText,
    Trash,
    Plus,
    PencilSimple,
    List,
    X,
    ArrowsClockwise,
    Heart,
    CurrencyCircleDollar,
    Heartbeat,
    Briefcase,
    Notepad,
    Palette,
    NumberSquareOne,
    Compass,
    PawPrint,
    Scales,
    Target,
    Leaf,
    CaretLeft,
    CaretRight,
    PaperPlaneTilt
  } from 'phosphor-svelte';

  // marked 설정
  marked.setOptions({
    breaks: true,
    gfm: true
  });

  function renderMarkdown(text: string): string {
    return marked.parse(text) as string;
  }

  // 상태 관리
  let currentView: 'chat' | 'saju' | 'fortune' | 'dashboard' | 'calendar' = 'chat';
  let isLoading = false;
  let error = '';
  let showSidebar = false;

  // 사용자 & 사주 정보
  let hasUser = false;
  let userName = '';
  let sajuInfo: {
    yearPillar: string;
    monthPillar: string;
    dayPillar: string;
    hourPillar: string;
    animal: string;
    ohaengCount: Record<string, number>;
    summary: string;
  } | null = null;

  // 사주 입력 폼
  let formName = '';
  let formYear = 1990;
  let formMonth = 1;
  let formDay = 1;
  let formHour = 12;
  let formGender: 'male' | 'female' = 'male';

  // 채팅 관련
  let messages: Array<{ id?: string; role: 'user' | 'assistant'; content: string; createdAt: string }> = [];
  let sessions: Array<{ id: string; title: string; updatedAt: string }> = [];
  let currentSessionId: string | null = null;
  let inputMessage = '';
  let chatContainer: HTMLDivElement;

  // 운세 관련
  let fortune: {
    date: string;
    todayPillar: string;
    categories: {
      overall: number;
      love: number;
      money: number;
      health: number;
      work: number;
    };
    advice: string;
    luckyColor: string;
    luckyNumber: number;
    luckyDirection: string;
  } | null = null;

  // 대시보드 관련
  let dashboard: {
    userName: string;
    birthInfo: string;
    gender: string;
    pillars: { year: string; month: string; day: string; hour: string };
    animal: string;
    elements: { wood: number; fire: number; earth: number; metal: number; water: number };
    strength: {
      ratio: number;
      label: string;
      isStrong: boolean;
      description: string;
      dayElement: string;
      dayElementFull: string;
      support: number;
      suppress: number;
    };
    yongshin: {
      kind: string;
      roles: {
        yong: { element: string | null; name: string; label: string };
        hee: { element: string | null; name: string; label: string };
        ki: { element: string | null; name: string; label: string };
        gu: { element: string | null; name: string; label: string };
        han: { element: string | null; name: string; label: string };
      };
    };
    relations: Array<{
      category: string;
      title: string;
      description: string;
      element: string | null;
      elementName: string;
      pillars: Array<{ key: string; label: string; value: string; kind: string }>;
    }>;
    todayFortune: {
      date: string;
      pillar: string;
      pillarElement: { stem: string; branch: string };
      scores: { overall: number; love: number; money: number; health: number; work: number };
      lucky: { color: string; number: number; direction: string };
      mood: { level: number; label: string; emoji: string; description: string };
      advice: string;
    };
  } | null = null;

  // 달력 관련
  let calendarData: {
    year: number;
    month: number;
    firstDayOfWeek: number;
    daysInMonth: number;
    fortunes: Array<{
      day: number;
      date: string;
      todayPillar: string;
      overallScore: number;
      luckyColor: string;
    }>;
  } | null = null;
  let selectedCalendarDate: string | null = null;

  onMount(async () => {
    await loadSajuInfo();
    await loadChatData();
  });

  async function loadSajuInfo() {
    try {
      const res = await fetch('/api/saju');
      const data = await res.json();

      if (data.success && data.hasUser) {
        hasUser = true;
        userName = data.user.name;
        sajuInfo = data.saju;

        formName = data.user.name;
        formYear = data.user.birthYear;
        formMonth = data.user.birthMonth;
        formDay = data.user.birthDay;
        formHour = data.user.birthHour;
        formGender = data.user.gender;
      }
    } catch (e) {
      console.error('사주 정보 로드 실패:', e);
    }
  }

  async function loadChatData(sessionId?: string) {
    try {
      const url = sessionId ? `/api/chat?sessionId=${sessionId}` : '/api/chat';
      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        sessions = data.sessions || [];
        messages = data.messages || [];
        currentSessionId = data.currentSessionId;
        scrollToBottom();
      }
    } catch (e) {
      console.error('채팅 데이터 로드 실패:', e);
    }
  }

  async function saveSaju() {
    if (!formName.trim()) {
      error = '이름을 입력해주세요.';
      return;
    }

    isLoading = true;
    error = '';

    try {
      const res = await fetch('/api/saju', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          birthYear: formYear,
          birthMonth: formMonth,
          birthDay: formDay,
          birthHour: formHour,
          gender: formGender
        })
      });

      const data = await res.json();

      if (data.success) {
        hasUser = true;
        userName = data.user.name;
        sajuInfo = data.saju;
        currentView = 'chat';
      } else {
        error = data.message || '등록에 실패했습니다.';
      }
    } catch (e) {
      error = '서버 오류가 발생했습니다.';
    } finally {
      isLoading = false;
    }
  }

  async function sendMessage() {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    inputMessage = '';

    messages = [...messages, {
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString()
    }];
    scrollToBottom();

    isLoading = true;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId: currentSessionId
        })
      });

      const data = await res.json();

      if (data.success) {
        messages = [...messages, {
          role: 'assistant',
          content: data.response,
          createdAt: new Date().toISOString()
        }];
        currentSessionId = data.sessionId;
        // 세션 목록 새로고침
        await loadChatData(currentSessionId);
      } else {
        messages = [...messages, {
          role: 'assistant',
          content: '죄송합니다. 응답을 생성하는 데 문제가 발생했습니다.',
          createdAt: new Date().toISOString()
        }];
      }
    } catch (e) {
      messages = [...messages, {
        role: 'assistant',
        content: '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.',
        createdAt: new Date().toISOString()
      }];
    } finally {
      isLoading = false;
      scrollToBottom();
    }
  }

  // 다시 생성
  async function regenerateResponse() {
    if (isLoading || !currentSessionId) return;

    // 마지막 assistant 메시지 UI에서 제거
    const lastAssistantIndex = messages.findLastIndex(m => m.role === 'assistant');
    if (lastAssistantIndex === -1) return;

    messages = messages.slice(0, lastAssistantIndex);
    isLoading = true;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate',
          sessionId: currentSessionId
        })
      });

      const data = await res.json();

      if (data.success) {
        messages = [...messages, {
          role: 'assistant',
          content: data.response,
          createdAt: new Date().toISOString()
        }];
      } else {
        messages = [...messages, {
          role: 'assistant',
          content: '죄송합니다. 다시 생성하는 데 문제가 발생했습니다.',
          createdAt: new Date().toISOString()
        }];
      }
    } catch (e) {
      messages = [...messages, {
        role: 'assistant',
        content: '서버 연결에 실패했습니다.',
        createdAt: new Date().toISOString()
      }];
    } finally {
      isLoading = false;
      scrollToBottom();
    }
  }

  // 새 대화 시작
  async function startNewChat() {
    try {
      const res = await fetch('/api/chat', { method: 'PUT' });
      const data = await res.json();

      if (data.success) {
        currentSessionId = data.session.id;
        messages = [];
        await loadChatData(currentSessionId);
        showSidebar = false;
      }
    } catch (e) {
      console.error('새 대화 생성 실패:', e);
    }
  }

  // 세션 선택
  async function selectSession(sessionId: string) {
    currentSessionId = sessionId;
    await loadChatData(sessionId);
    showSidebar = false;
  }

  // 세션 삭제
  async function deleteSession(sessionId: string, event: Event) {
    event.stopPropagation();

    if (!confirm('이 대화를 삭제하시겠습니까?')) return;

    try {
      await fetch(`/api/chat?sessionId=${sessionId}`, { method: 'DELETE' });
      sessions = sessions.filter(s => s.id !== sessionId);

      if (currentSessionId === sessionId) {
        if (sessions.length > 0) {
          await selectSession(sessions[0].id);
        } else {
          currentSessionId = null;
          messages = [];
        }
      }
    } catch (e) {
      console.error('세션 삭제 실패:', e);
    }
  }

  async function loadFortune() {
    if (!hasUser) {
      error = '먼저 사주를 등록해주세요.';
      currentView = 'saju';
      return;
    }

    isLoading = true;
    error = '';

    try {
      const res = await fetch('/api/fortune');
      const data = await res.json();

      if (data.success) {
        fortune = data.fortune;
      } else {
        error = data.message || '운세를 불러오는 데 실패했습니다.';
      }
    } catch (e) {
      error = '서버 오류가 발생했습니다.';
    } finally {
      isLoading = false;
    }
  }

  async function loadDashboard() {
    if (!hasUser) {
      error = '먼저 사주를 등록해주세요.';
      currentView = 'saju';
      return;
    }

    isLoading = true;
    error = '';

    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();

      if (data.success) {
        dashboard = data.dashboard;
      } else {
        error = data.message || '대시보드를 불러오는 데 실패했습니다.';
      }
    } catch (e) {
      error = '서버 오류가 발생했습니다.';
    } finally {
      isLoading = false;
    }
  }

  async function loadCalendar(year?: number, month?: number) {
    if (!hasUser) {
      error = '먼저 사주를 등록해주세요.';
      currentView = 'saju';
      return;
    }

    isLoading = true;
    error = '';

    try {
      const now = new Date();
      const y = year ?? now.getFullYear();
      const m = month ?? now.getMonth() + 1;

      const res = await fetch(`/api/calendar?year=${y}&month=${m}`);
      const data = await res.json();

      if (data.success) {
        calendarData = data.calendar;
      } else {
        error = data.message || '달력을 불러오는 데 실패했습니다.';
      }
    } catch (e) {
      error = '서버 오류가 발생했습니다.';
    } finally {
      isLoading = false;
    }
  }

  function prevMonth() {
    if (!calendarData) return;
    let y = calendarData.year;
    let m = calendarData.month - 1;
    if (m < 1) {
      m = 12;
      y--;
    }
    loadCalendar(y, m);
  }

  function nextMonth() {
    if (!calendarData) return;
    let y = calendarData.year;
    let m = calendarData.month + 1;
    if (m > 12) {
      m = 1;
      y++;
    }
    loadCalendar(y, m);
  }

  function getFortuneForDay(day: number) {
    return calendarData?.fortunes.find(f => f.day === day);
  }

  function getDayScoreColor(score: number): string {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#8b5cf6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#8b5cf6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  }

  // 마지막 메시지가 assistant인지 확인
  $: canRegenerate = messages.length > 0 && messages[messages.length - 1]?.role === 'assistant';
</script>

<div class="app-wrapper">
  <div class="app-container">
    <!-- 사이드바 -->
    <aside class="sidebar" class:open={showSidebar}>
      <div class="sidebar-header">
        <h2><Sparkle size={18} weight="fill" /> 사주몽</h2>
        <button class="new-chat-btn-small" onclick={startNewChat} title="새 대화">
          <PencilSimple size={18} />
        </button>
      </div>

      <div class="session-list">
        {#each sessions as session}
          <div
            class="session-item"
            class:active={session.id === currentSessionId}
            onclick={() => selectSession(session.id)}
            onkeydown={(e) => e.key === 'Enter' && selectSession(session.id)}
            role="button"
            tabindex="0"
          >
            <div class="session-info">
              <span class="session-title">{session.title}</span>
              <span class="session-date">{formatDate(session.updatedAt)}</span>
            </div>
            <button class="delete-session-btn" onclick={(e) => deleteSession(session.id, e)}>
              <Trash size={16} />
            </button>
          </div>
        {/each}

        {#if sessions.length === 0}
          <div class="no-sessions">
            아직 대화가 없습니다
          </div>
        {/if}
      </div>

    </aside>

    <!-- 사이드바 오버레이 (모바일) -->
    {#if showSidebar}
      <button class="sidebar-overlay" onclick={() => showSidebar = false} aria-label="사이드바 닫기"></button>
    {/if}

    <!-- 메인 영역 -->
    <div class="main-area">
    <!-- 헤더 -->
    <header class="header">
      <div class="header-left">
        {#if currentView === 'chat'}
          <button class="menu-btn" onclick={() => showSidebar = true}><List size={22} /></button>
        {/if}
        <h1 class="logo"><Sparkle size={22} weight="fill" /> 사주몽</h1>
      </div>
      <nav class="nav">
        <button
          class="nav-btn"
          class:active={currentView === 'chat'}
          onclick={() => currentView = 'chat'}
          title="채팅"
        >
          <ChatCircle size={22} weight={currentView === 'chat' ? 'fill' : 'regular'} />
        </button>
        <button
          class="nav-btn"
          class:active={currentView === 'dashboard'}
          onclick={() => { currentView = 'dashboard'; loadDashboard(); }}
          title="대시보드"
        >
          <ChartBar size={22} weight={currentView === 'dashboard' ? 'fill' : 'regular'} />
        </button>
        <button
          class="nav-btn"
          class:active={currentView === 'calendar'}
          onclick={() => { currentView = 'calendar'; loadCalendar(); }}
          title="달력"
        >
          <Calendar size={22} weight={currentView === 'calendar' ? 'fill' : 'regular'} />
        </button>
        <button
          class="nav-btn"
          class:active={currentView === 'fortune'}
          onclick={() => { currentView = 'fortune'; loadFortune(); }}
          title="오늘의 운세"
        >
          <Sparkle size={22} weight={currentView === 'fortune' ? 'fill' : 'regular'} />
        </button>
        <button
          class="nav-btn"
          class:active={currentView === 'saju'}
          onclick={() => currentView = 'saju'}
          title="사주 정보"
        >
          <ClipboardText size={22} weight={currentView === 'saju' ? 'fill' : 'regular'} />
        </button>
      </nav>
    </header>

    <!-- 메인 컨텐츠 -->
    <main class="main-content">
      {#if error}
        <div class="error-banner">
          {error}
          <button class="error-close" onclick={() => error = ''}><X size={16} /></button>
        </div>
      {/if}

      <!-- 채팅 뷰 -->
      {#if currentView === 'chat'}
        <div class="chat-view">
          {#if !hasUser}
            <div class="welcome-message">
              <div class="welcome-icon"><Sparkle size={48} weight="fill" /></div>
              <h2>사주몽에 오신 것을 환영합니다!</h2>
              <p>AI 사주 상담을 시작하려면 먼저 사주 정보를 등록해주세요.</p>
              <button class="primary-btn" onclick={() => currentView = 'saju'}>
                사주 등록하기
              </button>
            </div>
          {:else}
            <div class="chat-container" bind:this={chatContainer}>
              {#if messages.length === 0}
                <div class="chat-welcome">
                  <p>안녕하세요, <strong>{userName}</strong>님!</p>
                  <p>저는 사주몽이에요. 사주에 관해 궁금한 것이 있으면 무엇이든 물어보세요.</p>
                </div>
              {/if}

              {#each messages as message, index}
                <div class="message" class:user={message.role === 'user'} class:assistant={message.role === 'assistant'}>
                  <div class="message-content">
                    {#if message.role === 'assistant'}
                      {@html renderMarkdown(message.content)}
                    {:else}
                      {message.content}
                    {/if}
                  </div>
                  {#if message.role === 'assistant' && index === messages.length - 1 && !isLoading}
                    <div class="message-actions">
                      <button class="action-btn" onclick={regenerateResponse} title="다시 생성">
                        <ArrowsClockwise size={14} /> 다시 생성
                      </button>
                    </div>
                  {/if}
                </div>
              {/each}

              {#if isLoading}
                <div class="message assistant">
                  <div class="message-content typing">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                  </div>
                </div>
              {/if}
            </div>

            <div class="chat-input-container">
              <textarea
                class="chat-input"
                bind:value={inputMessage}
                onkeydown={handleKeydown}
                placeholder="메시지를 입력하세요..."
                rows="1"
                disabled={isLoading}
              ></textarea>
              <button
                class="send-btn"
                onclick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
              >
                <PaperPlaneTilt size={20} weight="fill" />
              </button>
            </div>
          {/if}
        </div>
      {/if}

      <!-- 운세 뷰 -->
      {#if currentView === 'fortune'}
        <div class="fortune-view">
          {#if isLoading}
            <div class="loading-spinner">
              <div class="spinner"></div>
              <p>오늘의 운세를 불러오는 중...</p>
            </div>
          {:else if fortune}
            <div class="fortune-card">
              <h2><Sparkle size={24} weight="fill" /> {fortune.date} 운세</h2>
              <p class="today-pillar">오늘의 일진: <strong>{fortune.todayPillar}</strong></p>

              <div class="fortune-scores">
                <div class="score-item">
                  <span class="score-label"><Sparkle size={16} /> 총운</span>
                  <div class="score-bar">
                    <div class="score-fill" style="width: {fortune.categories.overall}%; background-color: {getScoreColor(fortune.categories.overall)}"></div>
                  </div>
                  <span class="score-value">{fortune.categories.overall}점</span>
                </div>
                <div class="score-item">
                  <span class="score-label"><Heart size={16} /> 애정운</span>
                  <div class="score-bar">
                    <div class="score-fill" style="width: {fortune.categories.love}%; background-color: {getScoreColor(fortune.categories.love)}"></div>
                  </div>
                  <span class="score-value">{fortune.categories.love}점</span>
                </div>
                <div class="score-item">
                  <span class="score-label"><CurrencyCircleDollar size={16} /> 금전운</span>
                  <div class="score-bar">
                    <div class="score-fill" style="width: {fortune.categories.money}%; background-color: {getScoreColor(fortune.categories.money)}"></div>
                  </div>
                  <span class="score-value">{fortune.categories.money}점</span>
                </div>
                <div class="score-item">
                  <span class="score-label"><Heartbeat size={16} /> 건강운</span>
                  <div class="score-bar">
                    <div class="score-fill" style="width: {fortune.categories.health}%; background-color: {getScoreColor(fortune.categories.health)}"></div>
                  </div>
                  <span class="score-value">{fortune.categories.health}점</span>
                </div>
                <div class="score-item">
                  <span class="score-label"><Briefcase size={16} /> 직장운</span>
                  <div class="score-bar">
                    <div class="score-fill" style="width: {fortune.categories.work}%; background-color: {getScoreColor(fortune.categories.work)}"></div>
                  </div>
                  <span class="score-value">{fortune.categories.work}점</span>
                </div>
              </div>

              <div class="fortune-advice">
                <h3><Notepad size={18} /> 오늘의 조언</h3>
                <p>{fortune.advice}</p>
              </div>

              <div class="lucky-items">
                <div class="lucky-item">
                  <span class="lucky-label"><Palette size={16} /> 행운의 색</span>
                  <span class="lucky-value">{fortune.luckyColor}</span>
                </div>
                <div class="lucky-item">
                  <span class="lucky-label"><NumberSquareOne size={16} /> 행운의 숫자</span>
                  <span class="lucky-value">{fortune.luckyNumber}</span>
                </div>
                <div class="lucky-item">
                  <span class="lucky-label"><Compass size={16} /> 행운의 방향</span>
                  <span class="lucky-value">{fortune.luckyDirection}</span>
                </div>
              </div>
            </div>
          {:else}
            <div class="empty-fortune">
              <p>운세 정보를 불러올 수 없습니다.</p>
              <button class="primary-btn" onclick={loadFortune}>다시 시도</button>
            </div>
          {/if}
        </div>
      {/if}

      <!-- 사주 뷰 -->
      {#if currentView === 'saju'}
        <div class="saju-view">
          <div class="saju-form-card">
            <h2><ClipboardText size={22} /> 사주 정보 {hasUser ? '수정' : '등록'}</h2>

            <div class="form-group">
              <label for="name">이름</label>
              <input type="text" id="name" bind:value={formName} placeholder="이름을 입력하세요" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="year">출생년도</label>
                <input type="number" id="year" bind:value={formYear} min="1900" max={new Date().getFullYear()} />
              </div>
              <div class="form-group">
                <label for="month">월</label>
                <select id="month" bind:value={formMonth}>
                  {#each Array(12) as _, i}
                    <option value={i + 1}>{i + 1}월</option>
                  {/each}
                </select>
              </div>
              <div class="form-group">
                <label for="day">일</label>
                <select id="day" bind:value={formDay}>
                  {#each Array(31) as _, i}
                    <option value={i + 1}>{i + 1}일</option>
                  {/each}
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="hour">출생시간</label>
                <select id="hour" bind:value={formHour}>
                  {#each Array(24) as _, i}
                    <option value={i}>{i}시 ({getTimeSlot(i)})</option>
                  {/each}
                </select>
              </div>
              <div class="form-group">
                <label for="gender">성별</label>
                <div class="gender-options" id="gender">
                  <label class="gender-option">
                    <input type="radio" bind:group={formGender} value="male" />
                    <span>남성</span>
                  </label>
                  <label class="gender-option">
                    <input type="radio" bind:group={formGender} value="female" />
                    <span>여성</span>
                  </label>
                </div>
              </div>
            </div>

            <button class="primary-btn full-width" onclick={saveSaju} disabled={isLoading}>
              {isLoading ? '저장 중...' : (hasUser ? '수정하기' : '등록하기')}
            </button>
          </div>

          {#if sajuInfo}
            <div class="saju-info-card">
              <h2><Sparkle size={22} weight="fill" /> 나의 사주팔자</h2>

              <div class="pillars">
                {#each [
                  { label: '년주', value: sajuInfo.yearPillar },
                  { label: '월주', value: sajuInfo.monthPillar },
                  { label: '일주', value: sajuInfo.dayPillar, highlight: true },
                  { label: '시주', value: sajuInfo.hourPillar }
                ] as pillar}
                  <div class="pillar">
                    <span class="pillar-label">{pillar.label}</span>
                    <span class="pillar-value" class:highlight={pillar.highlight}>{pillar.value}</span>
                  </div>
                {/each}
              </div>

              <div class="animal-info">
                <span><PawPrint size={16} /> 띠: {sajuInfo.animal}띠</span>
              </div>

              <div class="ohaeng-chart">
                <h3>오행 분포</h3>
                <div class="ohaeng-bars">
                  {#each Object.entries(sajuInfo.ohaengCount) as [ohaeng, count]}
                    <div class="ohaeng-bar-item">
                      <span class="ohaeng-name">{ohaeng}</span>
                      <div class="ohaeng-bar">
                        <div
                          class="ohaeng-fill"
                          style="width: {(count as number) * 12.5}%"
                          class:wood={ohaeng === '목'}
                          class:fire={ohaeng === '화'}
                          class:earth={ohaeng === '토'}
                          class:metal={ohaeng === '금'}
                          class:water={ohaeng === '수'}
                        ></div>
                      </div>
                      <span class="ohaeng-count">{count}</span>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <!-- 대시보드 뷰 -->
      {#if currentView === 'dashboard'}
        <div class="dashboard-view">
          {#if isLoading}
            <div class="loading-spinner">
              <div class="spinner"></div>
              <p>대시보드를 불러오는 중...</p>
            </div>
          {:else if dashboard}
            <!-- 오늘의 나 - 사주몽 캐릭터 -->
            <div class="today-hero-card">
              <div class="hero-date">{dashboard.todayFortune.date}</div>

              <div class="sajumong-character" data-mood={dashboard.todayFortune.mood.level}>
                <div class="character-body">
                  <div class="character-aura" class:glow={dashboard.todayFortune.mood.level >= 4}></div>
                  <div class="character-face">
                    <div class="character-eyes">
                      <div class="eye left" class:sparkle={dashboard.todayFortune.mood.level >= 4} class:sad={dashboard.todayFortune.mood.level <= 2}></div>
                      <div class="eye right" class:sparkle={dashboard.todayFortune.mood.level >= 4} class:sad={dashboard.todayFortune.mood.level <= 2}></div>
                    </div>
                    <div class="character-mouth"
                      class:happy={dashboard.todayFortune.mood.level >= 4}
                      class:neutral={dashboard.todayFortune.mood.level === 3}
                      class:sad={dashboard.todayFortune.mood.level <= 2}
                    ></div>
                    {#if dashboard.todayFortune.mood.level <= 2}
                      <div class="character-sweat"></div>
                    {/if}
                  </div>
                  <div class="character-crystal"><Sparkle size={32} weight="fill" /></div>
                </div>
              </div>

              <div class="hero-mood">
                <span class="mood-emoji">{dashboard.todayFortune.mood.emoji}</span>
                <span class="mood-label">{dashboard.todayFortune.mood.label}</span>
              </div>

              <div class="hero-score">
                <div class="score-circle" style="--score: {dashboard.todayFortune.scores.overall}">
                  <svg viewBox="0 0 100 100">
                    <circle class="score-bg" cx="50" cy="50" r="45"/>
                    <circle class="score-fill" cx="50" cy="50" r="45"
                      stroke-dasharray="{dashboard.todayFortune.scores.overall * 2.83} 283"/>
                  </svg>
                  <div class="score-text">
                    <span class="score-number">{dashboard.todayFortune.scores.overall}</span>
                    <span class="score-unit">점</span>
                  </div>
                </div>
              </div>

              <p class="hero-description">{dashboard.todayFortune.mood.description}</p>

              <div class="hero-pillar">
                <span class="pillar-label">오늘의 일진</span>
                <span class="pillar-value">{dashboard.todayFortune.pillar}</span>
                <span class="pillar-elements">({dashboard.todayFortune.pillarElement.stem}/{dashboard.todayFortune.pillarElement.branch})</span>
              </div>
            </div>

            <!-- 오늘의 조언 -->
            <div class="dashboard-card advice-card">
              <div class="advice-icon"><ChatCircle size={24} weight="fill" /></div>
              <p class="advice-text">"{dashboard.todayFortune.advice}"</p>
            </div>

            <!-- 카테고리별 운세 -->
            <div class="dashboard-card scores-card">
              <h2><ChartBar size={20} /> 오늘의 운세</h2>
              <div class="category-scores">
                <div class="category-item">
                  <span class="cat-icon"><Sparkle size={18} /></span>
                  <span class="cat-label">총운</span>
                  <div class="cat-bar">
                    <div class="cat-fill" style="width: {dashboard.todayFortune.scores.overall}%; background: {getScoreColor(dashboard.todayFortune.scores.overall)}"></div>
                  </div>
                  <span class="cat-score">{dashboard.todayFortune.scores.overall}</span>
                </div>
                <div class="category-item">
                  <span class="cat-icon"><Heart size={18} /></span>
                  <span class="cat-label">애정</span>
                  <div class="cat-bar">
                    <div class="cat-fill" style="width: {dashboard.todayFortune.scores.love}%; background: {getScoreColor(dashboard.todayFortune.scores.love)}"></div>
                  </div>
                  <span class="cat-score">{dashboard.todayFortune.scores.love}</span>
                </div>
                <div class="category-item">
                  <span class="cat-icon"><CurrencyCircleDollar size={18} /></span>
                  <span class="cat-label">금전</span>
                  <div class="cat-bar">
                    <div class="cat-fill" style="width: {dashboard.todayFortune.scores.money}%; background: {getScoreColor(dashboard.todayFortune.scores.money)}"></div>
                  </div>
                  <span class="cat-score">{dashboard.todayFortune.scores.money}</span>
                </div>
                <div class="category-item">
                  <span class="cat-icon"><Heartbeat size={18} /></span>
                  <span class="cat-label">건강</span>
                  <div class="cat-bar">
                    <div class="cat-fill" style="width: {dashboard.todayFortune.scores.health}%; background: {getScoreColor(dashboard.todayFortune.scores.health)}"></div>
                  </div>
                  <span class="cat-score">{dashboard.todayFortune.scores.health}</span>
                </div>
                <div class="category-item">
                  <span class="cat-icon"><Briefcase size={18} /></span>
                  <span class="cat-label">직장</span>
                  <div class="cat-bar">
                    <div class="cat-fill" style="width: {dashboard.todayFortune.scores.work}%; background: {getScoreColor(dashboard.todayFortune.scores.work)}"></div>
                  </div>
                  <span class="cat-score">{dashboard.todayFortune.scores.work}</span>
                </div>
              </div>
            </div>

            <!-- 행운 아이템 -->
            <div class="dashboard-card lucky-card">
              <h2><Sparkle size={20} weight="fill" /> 오늘의 행운</h2>
              <div class="lucky-grid">
                <div class="lucky-item-big">
                  <span class="lucky-icon"><Palette size={24} /></span>
                  <span class="lucky-label">행운의 색</span>
                  <span class="lucky-value">{dashboard.todayFortune.lucky.color}</span>
                </div>
                <div class="lucky-item-big">
                  <span class="lucky-icon"><NumberSquareOne size={24} /></span>
                  <span class="lucky-label">행운의 숫자</span>
                  <span class="lucky-value">{dashboard.todayFortune.lucky.number}</span>
                </div>
                <div class="lucky-item-big">
                  <span class="lucky-icon"><Compass size={24} /></span>
                  <span class="lucky-label">행운의 방향</span>
                  <span class="lucky-value">{dashboard.todayFortune.lucky.direction}</span>
                </div>
              </div>
            </div>

            <!-- 나의 기운 분석 (축소) -->
            <div class="dashboard-card strength-card-mini">
              <h2><Scales size={20} /> 나의 기운</h2>
              <div class="strength-mini-content">
                <div class="strength-mini-gauge">
                  <div class="mini-gauge-bar">
                    <div class="mini-gauge-fill" style="width: {dashboard.strength.ratio}%"></div>
                    <div class="mini-gauge-marker" style="left: {dashboard.strength.ratio}%"></div>
                  </div>
                  <div class="mini-gauge-labels">
                    <span>신약</span>
                    <span>신강</span>
                  </div>
                </div>
                <div class="strength-mini-info">
                  <span class="mini-label">{dashboard.strength.label}</span>
                  <span class="mini-element">{dashboard.strength.dayElementFull}</span>
                </div>
              </div>
            </div>

            <!-- 용신 요약 -->
            <div class="dashboard-card yongshin-mini">
              <h2><Target size={20} /> 필요한 기운</h2>
              <div class="yongshin-summary">
                <div class="yong-item good">
                  <span class="yong-role">용신</span>
                  <span class="yong-value">{dashboard.yongshin.roles.yong.name || '없음'}</span>
                </div>
                <div class="yong-item good">
                  <span class="yong-role">희신</span>
                  <span class="yong-value">{dashboard.yongshin.roles.hee.name || '없음'}</span>
                </div>
                <div class="yong-item bad">
                  <span class="yong-role">기신</span>
                  <span class="yong-value">{dashboard.yongshin.roles.ki.name || '없음'}</span>
                </div>
              </div>
            </div>

            <!-- 오행 분포 (컴팩트) -->
            <div class="dashboard-card elements-mini">
              <h2><Leaf size={20} /> 오행 분포</h2>
              <div class="elements-row">
                {#each [
                  { name: '목', value: dashboard.elements.wood, color: '#22c55e' },
                  { name: '화', value: dashboard.elements.fire, color: '#ef4444' },
                  { name: '토', value: dashboard.elements.earth, color: '#eab308' },
                  { name: '금', value: dashboard.elements.metal, color: '#94a3b8' },
                  { name: '수', value: dashboard.elements.water, color: '#3b82f6' }
                ] as el}
                  <div class="element-mini-item">
                    <div class="element-mini-bar" style="height: {el.value * 15}px; background: {el.color}"></div>
                    <span class="element-mini-name">{el.name}</span>
                    <span class="element-mini-count">{el.value}</span>
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <div class="empty-dashboard">
              <p>대시보드 정보를 불러올 수 없습니다.</p>
              <button class="primary-btn" onclick={loadDashboard}>다시 시도</button>
            </div>
          {/if}
        </div>
      {/if}

      <!-- 달력 뷰 -->
      {#if currentView === 'calendar'}
        <div class="calendar-view">
          {#if isLoading}
            <div class="loading-spinner">
              <div class="spinner"></div>
              <p>달력을 불러오는 중...</p>
            </div>
          {:else if calendarData}
            <div class="calendar-card">
              <div class="calendar-header">
                <button class="calendar-nav-btn" onclick={prevMonth}><CaretLeft size={20} /></button>
                <h2>{calendarData.year}년 {calendarData.month}월</h2>
                <button class="calendar-nav-btn" onclick={nextMonth}><CaretRight size={20} /></button>
              </div>

              <div class="calendar-weekdays">
                {#each ['일', '월', '화', '수', '목', '금', '토'] as day, i}
                  <div class="weekday" class:sunday={i === 0} class:saturday={i === 6}>{day}</div>
                {/each}
              </div>

              <div class="calendar-days">
                {#each Array(calendarData.firstDayOfWeek) as _}
                  <div class="calendar-day empty"></div>
                {/each}
                {#each Array(calendarData.daysInMonth) as _, i}
                  {@const day = i + 1}
                  {@const fortune = getFortuneForDay(day)}
                  {@const dayOfWeek = (calendarData.firstDayOfWeek + i) % 7}
                  {@const isToday = new Date().getFullYear() === calendarData.year &&
                                   new Date().getMonth() + 1 === calendarData.month &&
                                   new Date().getDate() === day}
                  <div
                    class="calendar-day"
                    class:today={isToday}
                    class:selected={selectedCalendarDate === fortune?.date}
                    class:sunday={dayOfWeek === 0}
                    class:saturday={dayOfWeek === 6}
                    onclick={() => selectedCalendarDate = fortune?.date || null}
                    onkeydown={(e) => e.key === 'Enter' && (selectedCalendarDate = fortune?.date || null)}
                    role="button"
                    tabindex="0"
                  >
                    <span class="day-number">{day}</span>
                    {#if fortune}
                      <div class="day-score" style="background: {getDayScoreColor(fortune.overallScore)}">
                        {fortune.overallScore}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>

            <!-- 선택된 날짜의 상세 운세 -->
            {#if selectedCalendarDate}
              {@const selectedFortune = calendarData.fortunes.find(f => f.date === selectedCalendarDate)}
              {#if selectedFortune}
                <div class="selected-fortune-card">
                  <h3>{selectedCalendarDate}</h3>
                  <div class="selected-fortune-details">
                    <div class="fortune-detail-item">
                      <span class="fortune-detail-label">일진</span>
                      <span class="fortune-detail-value">{selectedFortune.todayPillar}</span>
                    </div>
                    <div class="fortune-detail-item">
                      <span class="fortune-detail-label">총운</span>
                      <span class="fortune-detail-value" style="color: {getDayScoreColor(selectedFortune.overallScore)}">
                        {selectedFortune.overallScore}점
                      </span>
                    </div>
                    <div class="fortune-detail-item">
                      <span class="fortune-detail-label">행운의 색</span>
                      <span class="fortune-detail-value">{selectedFortune.luckyColor}</span>
                    </div>
                  </div>
                </div>
              {/if}
            {/if}
          {:else}
            <div class="empty-calendar">
              <p>달력 정보를 불러올 수 없습니다.</p>
              <button class="primary-btn" onclick={() => loadCalendar()}>다시 시도</button>
            </div>
          {/if}
        </div>
      {/if}
    </main>
    </div>
  </div>
</div>

<script lang="ts" context="module">
  function getTimeSlot(hour: number): string {
    if (hour >= 23 || hour < 1) return '자시';
    if (hour < 3) return '축시';
    if (hour < 5) return '인시';
    if (hour < 7) return '묘시';
    if (hour < 9) return '진시';
    if (hour < 11) return '사시';
    if (hour < 13) return '오시';
    if (hour < 15) return '미시';
    if (hour < 17) return '신시';
    if (hour < 19) return '유시';
    if (hour < 21) return '술시';
    return '해시';
  }
</script>

<style>
  /* ==================== GPT Style Layout ==================== */

  .app-wrapper {
    height: 100vh;
    width: 100%;
    display: flex;
    justify-content: center;
    background: var(--gray-100);
  }

  .app-container {
    display: flex;
    width: 100%;
    max-width: 1400px;
    height: 100vh;
    background: var(--bg);
    box-shadow: var(--shadow-lg);
    position: relative;
    overflow: hidden;
  }

  /* ==================== Sidebar ==================== */
  .sidebar {
    width: 280px;
    min-width: 280px;
    height: 100%;
    background: var(--gray-900);
    color: var(--white);
    display: flex;
    flex-direction: column;
    transition: margin-left 0.3s ease;
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4) var(--space-4);
    border-bottom: 1px solid var(--gray-700);
  }

  .sidebar-header h2 {
    font-size: 16px;
    font-weight: 600;
    color: var(--white);
  }

  .new-chat-btn-small {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    background: var(--gray-700);
    color: var(--white);
    font-size: 16px;
  }

  .new-chat-btn-small:hover {
    background: var(--gray-600);
  }

  .session-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2);
  }

  .session-item {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-3);
    cursor: pointer;
    border-radius: var(--radius-md);
    margin-bottom: var(--space-1);
    background: transparent;
    border: none;
    color: var(--gray-300);
    text-align: left;
  }

  .session-item:hover {
    background: var(--gray-700);
    color: var(--white);
  }

  .session-item.active {
    background: var(--gray-700);
    color: var(--white);
  }

  .session-info {
    flex: 1;
    min-width: 0;
  }

  .session-title {
    display: block;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .session-date {
    display: block;
    font-size: 12px;
    color: var(--gray-500);
    margin-top: 2px;
  }

  .session-item.active .session-date,
  .session-item:hover .session-date {
    color: var(--gray-400);
  }

  .delete-session-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    font-size: 12px;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--gray-400);
  }

  .session-item:hover .delete-session-btn {
    opacity: 1;
  }

  .delete-session-btn:hover {
    background: var(--gray-600);
    color: var(--white);
  }

  .no-sessions {
    text-align: center;
    padding: var(--space-8);
    color: var(--gray-500);
    font-size: 14px;
  }

  .sidebar-overlay {
    display: none;
  }

  /* ==================== Main Area ==================== */
  .main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: var(--bg);
  }

  /* ==================== Mobile Responsive ==================== */
  @media (max-width: 768px) {
    .app-wrapper {
      background: var(--bg);
    }

    .app-container {
      max-width: 100%;
      box-shadow: none;
    }

    .sidebar {
      position: fixed;
      left: 0;
      top: 0;
      height: 100vh;
      z-index: 100;
      transform: translateX(-100%);
      box-shadow: var(--shadow-lg);
    }

    .sidebar.open {
      transform: translateX(0);
    }

    .sidebar-overlay {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 99;
      border: none;
      cursor: pointer;
    }
  }

  /* ==================== Header ==================== */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4) var(--space-6);
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .menu-btn {
    width: 40px;
    height: 40px;
    display: none;  /* 데스크탑에서 숨김 */
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 18px;
  }

  .menu-btn:hover {
    background: var(--gray-100);
    color: var(--text);
  }

  @media (max-width: 768px) {
    .menu-btn {
      display: flex;  /* 모바일에서만 보임 */
    }
  }

  .logo {
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
  }

  .nav {
    display: flex;
    gap: var(--space-1);
    background: var(--gray-100);
    padding: var(--space-1);
    border-radius: var(--radius-lg);
  }

  .nav-btn {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .nav-btn:hover {
    color: var(--text);
  }

  .nav-btn.active {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-sm);
  }

  /* ==================== Main Content ==================== */
  .main-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .error-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) var(--space-6);
    background: #fef2f2;
    color: #dc2626;
    font-size: 14px;
    font-weight: 500;
    border-bottom: 1px solid #fecaca;
  }

  .error-close {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
  }

  .error-close:hover {
    background: #fecaca;
  }

  /* ==================== Chat View ==================== */
  .chat-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .welcome-message {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-12);
    text-align: center;
  }

  .welcome-icon {
    color: var(--accent);
    margin-bottom: var(--space-4);
  }

  .welcome-message h2 {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: var(--space-3);
    color: var(--text);
  }

  .welcome-message p {
    margin-bottom: var(--space-6);
    color: var(--text-secondary);
    font-size: 15px;
    max-width: 360px;
    line-height: 1.6;
  }

  .chat-container {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .chat-welcome {
    text-align: center;
    padding: var(--space-10);
    color: var(--text-secondary);
  }

  .chat-welcome strong {
    color: var(--text);
    font-weight: 600;
  }

  .message {
    max-width: 75%;
    line-height: 1.6;
  }

  .message.user {
    align-self: flex-end;
    background: var(--gray-800);
    color: var(--white);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg);
  }

  .message.assistant {
    align-self: flex-start;
    background: var(--surface);
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border);
  }

  .message-content {
    word-break: break-word;
    font-size: 15px;
  }

  .message-content :global(p) {
    margin: 0 0 var(--space-3) 0;
  }

  .message-content :global(p:last-child) {
    margin-bottom: 0;
  }

  .message-content :global(strong) {
    font-weight: 600;
  }

  .message-content :global(em) {
    font-style: italic;
  }

  .message-content :global(ul), .message-content :global(ol) {
    margin: var(--space-3) 0;
    padding-left: var(--space-5);
  }

  .message-content :global(li) {
    margin: var(--space-2) 0;
  }

  .message-content :global(code) {
    background: var(--gray-100);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-family: 'SF Mono', Menlo, monospace;
    font-size: 13px;
  }

  .message-content :global(pre) {
    background: var(--gray-100);
    padding: var(--space-4);
    overflow-x: auto;
    margin: var(--space-3) 0;
    border-radius: var(--radius-md);
  }

  .message-content :global(pre code) {
    padding: 0;
    background: none;
  }

  .message-actions {
    margin-top: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--border);
  }

  .action-btn {
    color: var(--text-muted);
    font-size: 13px;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
  }

  .action-btn:hover {
    background: var(--gray-100);
    color: var(--text-secondary);
  }

  .typing {
    display: flex;
    gap: 6px;
    padding: var(--space-2) 0;
  }

  .dot {
    width: 8px;
    height: 8px;
    background: var(--gray-400);
    border-radius: var(--radius-full);
    animation: blink 1.2s ease-in-out infinite;
  }

  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }

  @keyframes blink {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }

  .chat-input-container {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-6);
    background: var(--surface);
    border-top: 1px solid var(--border);
  }

  .chat-input {
    flex: 1;
    padding: var(--space-3) var(--space-4);
    background: var(--gray-50);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    color: var(--text);
    resize: none;
    overflow: hidden;
    font-size: 15px;
  }

  .chat-input::placeholder {
    color: var(--text-muted);
  }

  .chat-input:focus {
    background: var(--white);
    border-color: var(--gray-300);
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.04);
  }

  .send-btn {
    padding: var(--space-3) var(--space-5);
    background: var(--gray-800);
    color: var(--white);
    font-weight: 500;
    font-size: 14px;
    border-radius: var(--radius-lg);
  }

  .send-btn:hover:not(:disabled) {
    background: var(--gray-700);
  }

  .send-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* ==================== Fortune View ==================== */
  .fortune-view {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-6);
  }

  .loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: var(--space-4);
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid var(--gray-200);
    border-top-color: var(--gray-600);
    border-radius: var(--radius-full);
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .fortune-card {
    background: var(--surface);
    padding: var(--space-8);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-md);
  }

  .fortune-card h2 {
    text-align: center;
    margin-bottom: var(--space-2);
    font-size: 20px;
    font-weight: 600;
  }

  .today-pillar {
    text-align: center;
    color: var(--text-secondary);
    margin-bottom: var(--space-8);
    font-size: 14px;
  }

  .today-pillar strong {
    color: var(--text);
    font-weight: 600;
  }

  .fortune-scores {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-bottom: var(--space-8);
  }

  .score-item {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .score-label {
    width: 80px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .score-bar {
    flex: 1;
    height: 8px;
    background: var(--gray-100);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .score-fill {
    height: 100%;
    border-radius: var(--radius-full);
    transition: width 0.5s ease;
  }

  .score-value {
    width: 40px;
    text-align: right;
    font-weight: 600;
    font-size: 14px;
    color: var(--text);
  }

  .fortune-advice {
    background: var(--gray-50);
    padding: var(--space-5);
    margin-bottom: var(--space-6);
    border-radius: var(--radius-lg);
  }

  .fortune-advice h3 {
    margin-bottom: var(--space-3);
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .fortune-advice p {
    color: var(--text-secondary);
    line-height: 1.7;
    font-size: 14px;
  }

  .lucky-items {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
  }

  .lucky-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
  }

  .lucky-label {
    font-size: 12px;
    color: var(--text-muted);
  }

  .lucky-value {
    font-weight: 600;
    font-size: 16px;
    color: var(--text);
  }

  .empty-fortune {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: var(--space-4);
    color: var(--text-secondary);
  }

  /* ==================== Saju View ==================== */
  .saju-view {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .saju-form-card, .saju-info-card {
    background: var(--surface);
    padding: var(--space-6);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-sm);
  }

  .saju-form-card h2, .saju-info-card h2 {
    margin-bottom: var(--space-6);
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
  }

  .form-group {
    margin-bottom: var(--space-4);
  }

  .form-group label {
    display: block;
    margin-bottom: var(--space-2);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .form-group input,
  .form-group select {
    width: 100%;
    padding: var(--space-3) var(--space-4);
    background: var(--gray-50);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-size: 15px;
  }

  .form-group input:focus,
  .form-group select:focus {
    background: var(--white);
    border-color: var(--gray-300);
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.04);
  }

  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--space-4);
  }

  .gender-options {
    display: flex;
    gap: var(--space-6);
    padding-top: var(--space-2);
  }

  .gender-option {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
  }

  .gender-option input {
    width: 18px;
    height: 18px;
    accent-color: var(--gray-800);
  }

  .primary-btn {
    padding: var(--space-3) var(--space-6);
    background: var(--gray-800);
    color: var(--white);
    font-weight: 500;
    font-size: 14px;
    border-radius: var(--radius-md);
  }

  .primary-btn:hover:not(:disabled) {
    background: var(--gray-700);
  }

  .primary-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .primary-btn.full-width {
    width: 100%;
    margin-top: var(--space-4);
  }

  .pillars {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-3);
    margin-bottom: var(--space-6);
  }

  .pillar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
  }

  .pillar-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-muted);
  }

  .pillar-value {
    font-size: 22px;
    font-weight: 600;
    color: var(--text);
  }

  .pillar-value.highlight {
    color: var(--accent);
  }

  .animal-info {
    text-align: center;
    margin-bottom: var(--space-6);
    font-size: 15px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .ohaeng-chart h3 {
    margin-bottom: var(--space-4);
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .ohaeng-bars {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .ohaeng-bar-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .ohaeng-name {
    width: 28px;
    font-weight: 600;
    font-size: 14px;
    color: var(--text);
  }

  .ohaeng-bar {
    flex: 1;
    height: 24px;
    background: var(--gray-100);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .ohaeng-fill {
    height: 100%;
    border-radius: var(--radius-sm);
  }

  .ohaeng-fill.wood { background: #22c55e; }
  .ohaeng-fill.fire { background: #ef4444; }
  .ohaeng-fill.earth { background: #eab308; }
  .ohaeng-fill.metal { background: var(--gray-400); }
  .ohaeng-fill.water { background: #3b82f6; }

  .ohaeng-count {
    width: 24px;
    text-align: center;
    font-weight: 600;
    font-size: 14px;
    color: var(--text);
  }

  /* ==================== Dashboard View ==================== */
  .dashboard-view {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .dashboard-card {
    background: var(--surface);
    padding: var(--space-5);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-sm);
  }

  .dashboard-card h2 {
    margin-bottom: var(--space-4);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  /* ===== Today Hero Card (사주몽 캐릭터) ===== */
  .today-hero-card {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    padding: var(--space-6);
    border-radius: var(--radius-xl);
    text-align: center;
    color: var(--white);
    position: relative;
    overflow: hidden;
  }

  .today-hero-card::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
    animation: rotate 20s linear infinite;
  }

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .hero-date {
    font-size: 13px;
    color: rgba(255,255,255,0.6);
    margin-bottom: var(--space-4);
    position: relative;
  }

  /* 사주몽 캐릭터 */
  .sajumong-character {
    position: relative;
    width: 120px;
    height: 120px;
    margin: 0 auto var(--space-4);
  }

  .character-body {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .character-aura {
    position: absolute;
    inset: -10px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%);
    opacity: 0.5;
  }

  .character-aura.glow {
    opacity: 1;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.1); opacity: 1; }
  }

  .character-face {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80px;
    height: 80px;
    background: linear-gradient(145deg, #e8d5b7 0%, #d4b896 100%);
    border-radius: 50%;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  }

  .character-eyes {
    display: flex;
    justify-content: center;
    gap: 16px;
    padding-top: 24px;
  }

  .eye {
    width: 10px;
    height: 10px;
    background: #2d2d2d;
    border-radius: 50%;
    position: relative;
  }

  .eye::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 4px;
    height: 4px;
    background: white;
    border-radius: 50%;
  }

  .eye.sparkle::after {
    animation: sparkle 1s ease-in-out infinite;
  }

  @keyframes sparkle {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .eye.sad {
    height: 6px;
    border-radius: 0 0 10px 10px;
    margin-top: 4px;
  }

  .character-mouth {
    width: 20px;
    height: 10px;
    margin: 12px auto 0;
    position: relative;
  }

  .character-mouth.happy {
    border: 3px solid #2d2d2d;
    border-top: none;
    border-radius: 0 0 20px 20px;
  }

  .character-mouth.neutral {
    width: 16px;
    height: 3px;
    background: #2d2d2d;
    border-radius: 2px;
    margin-top: 16px;
  }

  .character-mouth.sad {
    border: 3px solid #2d2d2d;
    border-bottom: none;
    border-radius: 20px 20px 0 0;
    margin-top: 14px;
  }

  .character-sweat {
    position: absolute;
    top: 20px;
    right: 8px;
    width: 6px;
    height: 10px;
    background: #87ceeb;
    border-radius: 50% 50% 50% 50%;
    animation: drip 1.5s ease-in-out infinite;
  }

  @keyframes drip {
    0%, 100% { transform: translateY(0); opacity: 1; }
    50% { transform: translateY(4px); opacity: 0.5; }
  }

  .character-crystal {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    font-size: 32px;
    filter: drop-shadow(0 4px 8px rgba(139, 92, 246, 0.5));
  }

  .hero-mood {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
    position: relative;
  }

  .mood-emoji {
    font-size: 24px;
  }

  .mood-label {
    font-size: 18px;
    font-weight: 700;
  }

  /* 점수 서클 */
  .hero-score {
    margin-bottom: var(--space-4);
    position: relative;
  }

  .score-circle {
    width: 100px;
    height: 100px;
    margin: 0 auto;
    position: relative;
  }

  .score-circle svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .score-bg {
    fill: none;
    stroke: rgba(255,255,255,0.1);
    stroke-width: 8;
  }

  .score-fill {
    fill: none;
    stroke: #8b5cf6;
    stroke-width: 8;
    stroke-linecap: round;
    transition: stroke-dasharray 1s ease;
  }

  .score-text {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .score-number {
    font-size: 28px;
    font-weight: 700;
  }

  .score-unit {
    font-size: 12px;
    color: rgba(255,255,255,0.6);
  }

  .hero-description {
    font-size: 14px;
    color: rgba(255,255,255,0.8);
    margin-bottom: var(--space-4);
    position: relative;
  }

  .hero-pillar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-size: 13px;
    color: rgba(255,255,255,0.6);
    position: relative;
  }

  .pillar-value {
    font-size: 16px;
    font-weight: 600;
    color: var(--white);
  }

  /* ===== Advice Card ===== */
  .advice-card {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border: none;
  }

  .advice-icon {
    font-size: 24px;
    flex-shrink: 0;
  }

  .advice-text {
    font-size: 14px;
    line-height: 1.6;
    color: #78350f;
    font-style: italic;
  }

  /* ===== Category Scores ===== */
  .category-scores {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .category-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .cat-icon {
    font-size: 16px;
    width: 24px;
    text-align: center;
  }

  .cat-label {
    width: 40px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .cat-bar {
    flex: 1;
    height: 8px;
    background: var(--gray-100);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .cat-fill {
    height: 100%;
    border-radius: var(--radius-full);
    transition: width 0.5s ease;
  }

  .cat-score {
    width: 30px;
    text-align: right;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }

  /* ===== Lucky Grid ===== */
  .lucky-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
  }

  .lucky-item-big {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
  }

  .lucky-item-big .lucky-icon {
    font-size: 24px;
  }

  .lucky-item-big .lucky-label {
    font-size: 11px;
    color: var(--text-muted);
  }

  .lucky-item-big .lucky-value {
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
  }

  /* ===== Strength Mini ===== */
  .strength-mini-content {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .strength-mini-gauge {
    flex: 1;
  }

  .mini-gauge-bar {
    height: 8px;
    background: linear-gradient(to right, #3b82f6, #22c55e 50%, #ef4444);
    border-radius: var(--radius-full);
    position: relative;
  }

  .mini-gauge-fill {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background: transparent;
  }

  .mini-gauge-marker {
    position: absolute;
    top: -3px;
    width: 4px;
    height: 14px;
    background: var(--gray-800);
    border-radius: 2px;
    transform: translateX(-50%);
  }

  .mini-gauge-labels {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--text-muted);
    margin-top: var(--space-1);
  }

  .strength-mini-info {
    text-align: right;
  }

  .mini-label {
    display: block;
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
  }

  .mini-element {
    font-size: 12px;
    color: var(--text-secondary);
  }

  /* ===== Yongshin Mini ===== */
  .yongshin-summary {
    display: flex;
    gap: var(--space-3);
  }

  .yong-item {
    flex: 1;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    text-align: center;
  }

  .yong-item.good {
    background: #ecfdf5;
  }

  .yong-item.bad {
    background: #fef2f2;
  }

  .yong-role {
    display: block;
    font-size: 11px;
    color: var(--text-muted);
    margin-bottom: var(--space-1);
  }

  .yong-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  /* ===== Elements Mini ===== */
  .elements-row {
    display: flex;
    justify-content: space-around;
    align-items: flex-end;
    height: 100px;
    padding-top: var(--space-4);
  }

  .element-mini-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
  }

  .element-mini-bar {
    width: 32px;
    min-height: 4px;
    border-radius: var(--radius-sm);
    transition: height 0.5s ease;
  }

  .element-mini-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
  }

  .element-mini-count {
    font-size: 11px;
    color: var(--text-muted);
  }

  .empty-dashboard {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: var(--space-4);
    color: var(--text-secondary);
  }

  /* ==================== Calendar View ==================== */
  .calendar-view {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .calendar-card {
    background: var(--surface);
    padding: var(--space-6);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-sm);
  }

  .calendar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-5);
  }

  .calendar-header h2 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
  }

  .calendar-nav-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 14px;
  }

  .calendar-nav-btn:hover {
    background: var(--gray-100);
    color: var(--text);
  }

  .calendar-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: var(--space-1);
    margin-bottom: var(--space-2);
  }

  .weekday {
    text-align: center;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    padding: var(--space-2);
  }

  .weekday.sunday {
    color: #ef4444;
  }

  .weekday.saturday {
    color: #3b82f6;
  }

  .calendar-days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: var(--space-1);
  }

  .calendar-day {
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background 0.15s;
  }

  .calendar-day:hover:not(.empty) {
    background: var(--gray-100);
  }

  .calendar-day.empty {
    cursor: default;
  }

  .calendar-day.today {
    background: var(--gray-100);
    box-shadow: inset 0 0 0 2px var(--gray-800);
  }

  .calendar-day.selected {
    background: var(--gray-800);
  }

  .calendar-day.selected .day-number {
    color: var(--white);
  }

  .calendar-day.sunday .day-number {
    color: #ef4444;
  }

  .calendar-day.saturday .day-number {
    color: #3b82f6;
  }

  .calendar-day.selected.sunday .day-number,
  .calendar-day.selected.saturday .day-number {
    color: var(--white);
  }

  .day-number {
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
  }

  .day-score {
    font-size: 10px;
    font-weight: 600;
    color: var(--white);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }

  .selected-fortune-card {
    background: var(--surface);
    padding: var(--space-5);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-sm);
  }

  .selected-fortune-card h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: var(--space-4);
  }

  .selected-fortune-details {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
  }

  .fortune-detail-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-3);
    background: var(--gray-50);
    border-radius: var(--radius-md);
  }

  .fortune-detail-label {
    font-size: 12px;
    color: var(--text-muted);
  }

  .fortune-detail-value {
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
  }

  .empty-calendar {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: var(--space-4);
    color: var(--text-secondary);
  }

  /* ==================== Responsive ==================== */
  @media (max-width: 640px) {
    .header {
      flex-direction: column;
      gap: var(--space-3);
      padding: var(--space-4);
    }

    .header-left {
      width: 100%;
      justify-content: space-between;
    }

    .nav {
      width: 100%;
    }

    .nav-btn {
      flex: 1;
      text-align: center;
      font-size: 16px;
      padding: var(--space-2) var(--space-3);
    }

    .pillars {
      grid-template-columns: repeat(2, 1fr);
    }

    .lucky-items {
      grid-template-columns: 1fr;
    }

    .message {
      max-width: 85%;
    }

    .chat-input-container {
      padding: var(--space-4);
    }

    .fortune-view, .saju-view, .dashboard-view, .calendar-view {
      padding: var(--space-4);
    }

    .selected-fortune-details {
      grid-template-columns: 1fr;
    }
  }
</style>
