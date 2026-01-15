<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { CaretLeft, CaretRight } from 'phosphor-svelte';
  import { hasUser, isLoading, error, t, locale } from '$lib/stores';

  type CalendarData = {
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
  };

  let calendarData: CalendarData | null = null;
  let selectedCalendarDate: string | null = null;

  function getDayScoreColor(score: number): string {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  }

  function getFortuneForDay(day: number) {
    return calendarData?.fortunes.find(f => f.day === day);
  }

  async function loadCalendar(year?: number, month?: number) {
    if (!$hasUser) {
      $error = $t.errors.registerSajuFirst;
      goto('/saju');
      return;
    }

    $isLoading = true;
    $error = '';

    try {
      const now = new Date();
      const targetYear = year ?? now.getFullYear();
      const targetMonth = month ?? now.getMonth() + 1;

      const res = await fetch(`/api/calendar?year=${targetYear}&month=${targetMonth}&locale=${$locale}`);
      const data = await res.json();

      if (data.success) {
        calendarData = data.calendar;
      } else {
        $error = data.message || $t.errors.loadFailed;
      }
    } catch (e) {
      $error = $t.errors.serverError;
    } finally {
      $isLoading = false;
    }
  }

  function prevMonth() {
    if (!calendarData) return;
    let { year, month } = calendarData;
    month--;
    if (month < 1) {
      month = 12;
      year--;
    }
    loadCalendar(year, month);
  }

  function nextMonth() {
    if (!calendarData) return;
    let { year, month } = calendarData;
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
    loadCalendar(year, month);
  }

  onMount(() => {
    loadCalendar();
  });
</script>

<div class="calendar-view">
  {#if $isLoading}
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p>{$t.common.loading}</p>
    </div>
  {:else if calendarData}
    <div class="calendar-card">
      <div class="calendar-header">
        <button class="calendar-nav-btn" onclick={prevMonth}><CaretLeft size={20} /></button>
        <h2>{$locale === 'ko' ? `${calendarData.year}년 ${calendarData.month}월` : `${['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][calendarData.month]} ${calendarData.year}`}</h2>
        <button class="calendar-nav-btn" onclick={nextMonth}><CaretRight size={20} /></button>
      </div>

      <div class="calendar-weekdays">
        {#each $t.calendar.weekdays as day, i}
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

    {#if selectedCalendarDate}
      {@const selectedFortune = calendarData.fortunes.find(f => f.date === selectedCalendarDate)}
      {#if selectedFortune}
        <div class="selected-fortune-card">
          <h3>{selectedCalendarDate}</h3>
          <div class="selected-fortune-details">
            <div class="fortune-detail-item">
              <span class="fortune-detail-label">{$t.calendar.pillar}</span>
              <span class="fortune-detail-value">{selectedFortune.todayPillar}</span>
            </div>
            <div class="fortune-detail-item">
              <span class="fortune-detail-label">{$t.fortune.overall}</span>
              <span class="fortune-detail-value" style="color: {getDayScoreColor(selectedFortune.overallScore)}">
                {$t.common.score.replace('{n}', String(selectedFortune.overallScore))}
              </span>
            </div>
            <div class="fortune-detail-item">
              <span class="fortune-detail-label">{$t.fortune.luckyColor}</span>
              <span class="fortune-detail-value">{selectedFortune.luckyColor}</span>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  {:else}
    <div class="empty-calendar">
      <p>{$t.errors.loadFailed}</p>
      <button class="primary-btn" onclick={() => loadCalendar()}>{$t.common.retry}</button>
    </div>
  {/if}
</div>

<style>
  .calendar-view {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
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
    background: transparent;
    border: none;
    cursor: pointer;
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

  .weekday.sunday { color: #ef4444; }
  .weekday.saturday { color: #3b82f6; }

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
    position: relative;
    background: transparent;
  }

  .calendar-day.empty {
    cursor: default;
  }

  .calendar-day:hover:not(.empty) {
    background: var(--gray-100);
  }

  .calendar-day.today {
    box-shadow: inset 0 0 0 2px var(--gray-400);
  }

  .calendar-day.selected {
    background: var(--gray-800);
    color: var(--white);
  }

  .calendar-day.sunday .day-number { color: #ef4444; }
  .calendar-day.saturday .day-number { color: #3b82f6; }
  .calendar-day.selected .day-number { color: var(--white); }

  .day-number {
    font-size: 14px;
    font-weight: 500;
  }

  .day-score {
    font-size: 10px;
    font-weight: 600;
    color: var(--white);
    padding: 2px 6px;
    border-radius: var(--radius-full);
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
    margin-bottom: var(--space-4);
    color: var(--text);
  }

  .selected-fortune-details {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-4);
  }

  .fortune-detail-item {
    text-align: center;
  }

  .fortune-detail-label {
    display: block;
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: var(--space-1);
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
    flex: 1;
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
    .calendar-view { padding: var(--space-4); }
    .selected-fortune-details { grid-template-columns: 1fr; }
  }
</style>
