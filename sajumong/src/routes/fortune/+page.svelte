<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { marked } from 'marked';
  import { hasUser, isLoading, error, t, locale } from '$lib/stores';

  // marked 설정
  marked.setOptions({
    breaks: true,
    gfm: true
  });

  function renderMarkdown(text: string): string {
    return marked.parse(text) as string;
  }

  type Fortune = {
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
  };

  let fortune: Fortune | null = null;

  function getScoreColor(score: number): string {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  }

  async function loadFortune() {
    if (!$hasUser) {
      $error = $t.errors.registerSajuFirst;
      goto('/saju');
      return;
    }

    $isLoading = true;
    $error = '';

    try {
      const res = await fetch(`/api/fortune?locale=${$locale}`);
      const data = await res.json();

      if (data.success) {
        fortune = data.fortune;
      } else {
        $error = data.message || $t.errors.loadFailed;
      }
    } catch (e) {
      $error = $t.errors.serverError;
    } finally {
      $isLoading = false;
    }
  }

  onMount(() => {
    loadFortune();
  });
</script>

<div class="fortune-view">
  {#if $isLoading}
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p>{$t.common.loading}</p>
    </div>
  {:else if fortune}
    <div class="fortune-card">
      <h2>{$t.fortune.title.replace('{date}', fortune.date)}</h2>
      <div class="today-pillar">
        <span class="pillar-label">{$t.fortune.todayPillar}</span>
        <span class="pillar-value">{fortune.todayPillar}</span>
      </div>

      <div class="fortune-scores">
        {#each [
          { label: $t.fortune.overall, score: fortune.categories.overall },
          { label: $t.fortune.love, score: fortune.categories.love },
          { label: $t.fortune.money, score: fortune.categories.money },
          { label: $t.fortune.health, score: fortune.categories.health },
          { label: $t.fortune.work, score: fortune.categories.work }
        ] as item}
          <div class="score-item">
            <span class="score-label">{item.label}</span>
            <div class="score-bar">
              <div class="score-fill" style="width: {item.score}%; background: {getScoreColor(item.score)}"></div>
            </div>
            <span class="score-value">{item.score}</span>
          </div>
        {/each}
      </div>

      <div class="fortune-advice">
        <h3>{$t.fortune.todaysAdvice}</h3>
        <div class="advice-content">
          {@html renderMarkdown(fortune.advice)}
        </div>
      </div>

      <div class="lucky-items">
        <div class="lucky-item">
          <span class="lucky-label">{$t.fortune.luckyColor}</span>
          <span class="lucky-value">{fortune.luckyColor}</span>
        </div>
        <div class="lucky-item">
          <span class="lucky-label">{$t.fortune.luckyNumber}</span>
          <span class="lucky-value">{fortune.luckyNumber}</span>
        </div>
        <div class="lucky-item">
          <span class="lucky-label">{$t.fortune.luckyDirection}</span>
          <span class="lucky-value">{fortune.luckyDirection}</span>
        </div>
      </div>
    </div>
  {:else}
    <div class="empty-fortune">
      <p>{$t.errors.loadFailed}</p>
      <button class="primary-btn" onclick={loadFortune}>{$t.common.retry}</button>
    </div>
  {/if}
</div>

<style>
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
    flex: 1;
    gap: var(--space-4);
    min-height: 400px;
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

  .fortune-card {
    background: var(--surface);
    padding: var(--space-8);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-md);
    max-width: 600px;
    margin: 0 auto;
  }

  .fortune-card h2 {
    font-size: 20px;
    font-weight: 600;
    text-align: center;
    margin-bottom: var(--space-6);
    color: var(--text);
  }

  .today-pillar {
    text-align: center;
    margin-bottom: var(--space-6);
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
    font-size: 24px;
    font-weight: 700;
    color: var(--text);
  }

  .fortune-scores {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin-bottom: var(--space-6);
  }

  .score-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .score-label {
    width: 60px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .score-bar {
    flex: 1;
    height: 12px;
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
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .fortune-advice {
    padding: var(--space-5);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-6);
  }

  .fortune-advice h3 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: var(--space-2);
  }

  .advice-content {
    font-size: 15px;
    line-height: 1.7;
    color: var(--text);
  }

  .advice-content :global(p) {
    margin-bottom: var(--space-3);
  }

  .advice-content :global(p:last-child) {
    margin-bottom: 0;
  }

  .advice-content :global(strong) {
    font-weight: 600;
    color: var(--text);
  }

  .lucky-items {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-4);
  }

  .lucky-item {
    text-align: center;
    padding: var(--space-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
  }

  .lucky-label {
    display: block;
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: var(--space-1);
  }

  .lucky-value {
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
  }

  .empty-fortune {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
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
    .fortune-view { padding: var(--space-4); }
    .lucky-items { grid-template-columns: 1fr; }
  }
</style>
