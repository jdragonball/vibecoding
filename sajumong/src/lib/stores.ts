import { writable } from 'svelte/store';

// i18n
export { locale, setLocale, t, getCurrentLocale, getTranslations } from '$lib/i18n';
export type { Locale } from '$lib/i18n';

// 사이드바 상태
export const showSidebar = writable(false);

// 사용자 정보
export const hasUser = writable(false);
export const userName = writable('');

// 사주 정보
export const sajuInfo = writable<{
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  animal: string;
  ohaengCount: Record<string, number>;
  summary: string;
} | null>(null);

// 채팅 세션
export const sessions = writable<Array<{ id: string; title: string; updatedAt: string }>>([]);
export const currentSessionId = writable<string | null>(null);

// 로딩 상태
export const isLoading = writable(false);

// 에러 상태
export const error = writable('');
