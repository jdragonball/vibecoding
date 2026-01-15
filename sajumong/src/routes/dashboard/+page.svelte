<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import {
    ChatCircle,
    ChartBar,
    Sparkle,
    Heart,
    CurrencyCircleDollar,
    Heartbeat,
    Briefcase,
    Palette,
    NumberSquareOne,
    Compass,
    Scales,
    Target,
    Leaf
  } from 'phosphor-svelte';
  import { hasUser, isLoading, error } from '$lib/stores';

  // 대시보드 데이터 타입
  type Dashboard = {
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
    todayFortune: {
      date: string;
      pillar: string;
      pillarElement: { stem: string; branch: string };
      scores: { overall: number; love: number; money: number; health: number; work: number };
      lucky: { color: string; number: number; direction: string };
      mood: { level: number; label: string; emoji: string; description: string };
      advice: string;
    };
  };

  let dashboard: Dashboard | null = null;

  function getScoreColor(score: number): string {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  }

  async function loadDashboard() {
    if (!$hasUser) {
      $error = '먼저 사주를 등록해주세요.';
      goto('/saju');
      return;
    }

    $isLoading = true;
    $error = '';

    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();

      if (data.success) {
        dashboard = data.dashboard;
      } else {
        $error = data.message || '대시보드를 불러오는 데 실패했습니다.';
      }
    } catch (e) {
      $error = '서버 오류가 발생했습니다.';
    } finally {
      $isLoading = false;
    }
  }

  onMount(() => {
    loadDashboard();
  });
</script>

<div class="dashboard-view">
  {#if $isLoading}
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

    <!-- 나의 기운 분석 -->
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

    <!-- 오행 분포 -->
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

<style>
  .dashboard-view {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: var(--space-4);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--gray-200);
    border-top-color: var(--gray-800);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .dashboard-card {
    background: var(--surface);
    padding: var(--space-5);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-sm);
  }

  .dashboard-card h2 {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  /* Hero Card */
  .today-hero-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 420px;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    padding: var(--space-6) var(--space-5);
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
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    font-size: 15px;
    font-weight: 500;
    color: rgba(255,255,255,0.85);
    margin-bottom: var(--space-5);
    position: relative;
    letter-spacing: 0.3px;
    line-height: 1.4;
  }

  /* Character */
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
    border-radius: 50%;
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
    color: #a855f7;
  }

  .hero-mood {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
    position: relative;
  }

  .mood-emoji { font-size: 28px; }
  .mood-label { font-size: 20px; font-weight: 700; }

  /* Score Circle */
  .hero-score {
    margin-bottom: var(--space-5);
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

  .score-number { font-size: 28px; font-weight: 700; }
  .score-unit { font-size: 12px; color: rgba(255,255,255,0.6); }

  .hero-description {
    font-size: 15px;
    line-height: 1.5;
    color: rgba(255,255,255,0.85);
    margin-bottom: var(--space-5);
    position: relative;
  }

  .hero-pillar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-size: 13px;
    color: rgba(255,255,255,0.7);
    position: relative;
    background: rgba(255,255,255,0.1);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-full);
  }

  .pillar-label { font-weight: 500; }
  .pillar-value { font-size: 15px; font-weight: 600; color: var(--white); }
  .pillar-elements { font-size: 12px; color: rgba(255,255,255,0.6); }

  /* Advice Card */
  .advice-card {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border: none;
    padding: var(--space-4) var(--space-5);
  }

  .advice-icon { flex-shrink: 0; color: #b45309; }
  .advice-text {
    font-size: 14px;
    line-height: 1.6;
    color: #78350f;
    font-style: italic;
    flex: 1;
  }

  /* Category Scores */
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
    width: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
  }

  .cat-label {
    width: 36px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .cat-bar {
    flex: 1;
    height: 10px;
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
    width: 32px;
    text-align: right;
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
  }

  /* Lucky Grid */
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
    padding: var(--space-4) var(--space-3);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
  }

  .lucky-item-big .lucky-icon { color: var(--primary); }
  .lucky-item-big .lucky-label { font-size: 11px; font-weight: 500; color: var(--text-muted); }
  .lucky-item-big .lucky-value { font-size: 17px; font-weight: 700; color: var(--text); }

  /* Strength Mini */
  .strength-mini-content {
    display: flex;
    align-items: center;
    gap: var(--space-5);
  }

  .strength-mini-gauge { flex: 1; }

  .mini-gauge-bar {
    height: 10px;
    background: linear-gradient(to right, #3b82f6, #22c55e 50%, #ef4444);
    border-radius: var(--radius-full);
    position: relative;
  }

  .mini-gauge-marker {
    position: absolute;
    top: -4px;
    width: 6px;
    height: 18px;
    background: var(--gray-800);
    border-radius: 3px;
    transform: translateX(-50%);
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  .mini-gauge-labels {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--text-muted);
    margin-top: var(--space-2);
  }

  .strength-mini-info {
    text-align: right;
    min-width: 60px;
  }

  .mini-label { display: block; font-size: 18px; font-weight: 700; color: var(--text); }
  .mini-element { font-size: 13px; color: var(--text-secondary); }

  /* Yongshin Mini */
  .yongshin-summary {
    display: flex;
    gap: var(--space-3);
  }

  .yong-item {
    flex: 1;
    padding: var(--space-3) var(--space-2);
    border-radius: var(--radius-lg);
    text-align: center;
  }

  .yong-item.good { background: #ecfdf5; }
  .yong-item.bad { background: #fef2f2; }

  .yong-role {
    display: block;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted);
    margin-bottom: var(--space-1);
  }

  .yong-value { font-size: 15px; font-weight: 700; color: var(--text); }

  /* Elements Mini */
  .elements-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    min-height: 80px;
    padding: var(--space-3) var(--space-2);
  }

  .element-mini-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    flex: 1;
  }

  .element-mini-bar {
    width: 28px;
    min-height: 6px;
    border-radius: var(--radius-sm);
    transition: height 0.5s ease;
  }

  .element-mini-name { font-size: 13px; font-weight: 600; color: var(--text); }
  .element-mini-count { font-size: 12px; font-weight: 500; color: var(--text-secondary); }

  .empty-dashboard {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: var(--space-4);
    color: var(--text-secondary);
  }

  .primary-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-5);
    background: var(--gray-900);
    color: var(--white);
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 500;
    border: none;
    cursor: pointer;
  }

  .primary-btn:hover { background: var(--gray-800); }

  @media (max-width: 640px) {
    .dashboard-view { padding: var(--space-4); }
    .lucky-grid { grid-template-columns: 1fr; }
  }
</style>
