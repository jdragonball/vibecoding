<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { hasUser, userName, sajuInfo, isLoading, error } from '$lib/stores';

  // 사주 입력 폼
  let formName = '';
  let formYear = 1990;
  let formMonth = 1;
  let formDay = 1;
  let formHour = 12;
  let formGender: 'male' | 'female' = 'male';

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

  async function loadSajuInfo() {
    try {
      const res = await fetch('/api/saju');
      const data = await res.json();

      if (data.success && data.user) {
        $hasUser = true;
        $userName = data.user.name;
        $sajuInfo = data.saju;

        // 폼에 기존 값 채우기
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

  async function saveSaju() {
    if (!formName.trim()) {
      $error = '이름을 입력해주세요.';
      return;
    }

    $isLoading = true;
    $error = '';

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
        $hasUser = true;
        $userName = data.user.name;
        $sajuInfo = data.saju;
        goto('/chat');
      } else {
        $error = data.message || '등록에 실패했습니다.';
      }
    } catch (e) {
      $error = '서버 오류가 발생했습니다.';
    } finally {
      $isLoading = false;
    }
  }

  onMount(() => {
    loadSajuInfo();
  });
</script>

<div class="saju-view">
  <div class="saju-form-card">
    <h2>{$hasUser ? '사주 정보 수정' : '사주 등록'}</h2>

    <div class="form-group">
      <label for="name">이름</label>
      <input type="text" id="name" bind:value={formName} placeholder="이름을 입력하세요" />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="year">태어난 해</label>
        <input type="number" id="year" bind:value={formYear} min="1900" max="2100" />
      </div>
      <div class="form-group">
        <label for="month">월</label>
        <input type="number" id="month" bind:value={formMonth} min="1" max="12" />
      </div>
      <div class="form-group">
        <label for="day">일</label>
        <input type="number" id="day" bind:value={formDay} min="1" max="31" />
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="hour">태어난 시간 ({getTimeSlot(formHour)})</label>
        <input type="number" id="hour" bind:value={formHour} min="0" max="23" />
      </div>
      <div class="form-group">
        <label>성별</label>
        <div class="gender-options">
          <label class="gender-option">
            <input type="radio" bind:group={formGender} value="male" />
            <span>남</span>
          </label>
          <label class="gender-option">
            <input type="radio" bind:group={formGender} value="female" />
            <span>여</span>
          </label>
        </div>
      </div>
    </div>

    <button class="primary-btn" onclick={saveSaju} disabled={$isLoading}>
      {$isLoading ? '저장 중...' : ($hasUser ? '수정하기' : '등록하기')}
    </button>
  </div>

  {#if $sajuInfo}
    <div class="saju-info-card">
      <h2>나의 사주팔자</h2>
      <div class="pillars">
        <div class="pillar">
          <span class="pillar-label">시주</span>
          <span class="pillar-value">{$sajuInfo.hourPillar}</span>
        </div>
        <div class="pillar">
          <span class="pillar-label">일주</span>
          <span class="pillar-value highlight">{$sajuInfo.dayPillar}</span>
        </div>
        <div class="pillar">
          <span class="pillar-label">월주</span>
          <span class="pillar-value">{$sajuInfo.monthPillar}</span>
        </div>
        <div class="pillar">
          <span class="pillar-label">년주</span>
          <span class="pillar-value">{$sajuInfo.yearPillar}</span>
        </div>
      </div>

      <div class="animal-info">
        <span class="animal-label">띠</span>
        <span class="animal-value">{$sajuInfo.animal}</span>
      </div>

      <div class="ohaeng-chart">
        <h3>오행 분포</h3>
        <div class="ohaeng-bars">
          {#each Object.entries($sajuInfo.ohaengCount) as [element, count]}
            <div class="ohaeng-bar-item">
              <span class="ohaeng-name">{element}</span>
              <div class="ohaeng-bar">
                <div class="ohaeng-fill {element}" style="width: {Math.min(count * 25, 100)}%"></div>
              </div>
              <span class="ohaeng-count">{count}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
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
    max-width: 600px;
    width: 100%;
    margin: 0 auto;
  }

  .saju-form-card h2, .saju-info-card h2 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: var(--space-5);
    color: var(--text);
  }

  .form-group {
    margin-bottom: var(--space-4);
  }

  .form-group label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: var(--space-2);
  }

  .form-group input[type="text"],
  .form-group input[type="number"] {
    width: 100%;
    padding: var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-size: 14px;
    background: var(--bg);
    color: var(--text);
  }

  .form-group input:focus {
    outline: none;
    border-color: var(--gray-400);
  }

  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--space-4);
  }

  .gender-options {
    display: flex;
    gap: var(--space-4);
  }

  .gender-option {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
    font-size: 14px;
    color: var(--text);
  }

  .gender-option input {
    accent-color: var(--gray-800);
  }

  .primary-btn {
    width: 100%;
    padding: var(--space-4);
    background: var(--gray-900);
    color: var(--white);
    border: none;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    margin-top: var(--space-4);
  }

  .primary-btn:hover:not(:disabled) {
    background: var(--gray-800);
  }

  .primary-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pillars {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-3);
    margin-bottom: var(--space-5);
  }

  .pillar {
    text-align: center;
    padding: var(--space-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
  }

  .pillar-label {
    display: block;
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: var(--space-1);
  }

  .pillar-value {
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
  }

  .pillar-value.highlight {
    color: var(--accent);
  }

  .animal-info {
    text-align: center;
    padding: var(--space-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-5);
  }

  .animal-label {
    display: block;
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: var(--space-1);
  }

  .animal-value {
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
  }

  .ohaeng-chart h3 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: var(--space-3);
  }

  .ohaeng-bars {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .ohaeng-bar-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .ohaeng-name {
    width: 30px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .ohaeng-bar {
    flex: 1;
    height: 10px;
    background: var(--gray-100);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .ohaeng-fill {
    height: 100%;
    border-radius: var(--radius-full);
    transition: width 0.5s ease;
  }

  .ohaeng-fill.목 { background: #22c55e; }
  .ohaeng-fill.화 { background: #ef4444; }
  .ohaeng-fill.토 { background: #eab308; }
  .ohaeng-fill.금 { background: #94a3b8; }
  .ohaeng-fill.수 { background: #3b82f6; }

  .ohaeng-count {
    width: 24px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    text-align: right;
  }

  @media (max-width: 640px) {
    .saju-view { padding: var(--space-4); }
    .pillars { grid-template-columns: repeat(2, 1fr); }
  }
</style>
