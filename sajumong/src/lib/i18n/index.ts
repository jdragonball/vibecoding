import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { Locale, Translations } from './types';
import { ko } from './locales/ko';
import { en } from './locales/en';

const LOCALE_STORAGE_KEY = 'sajumong-locale';

const translations: Record<Locale, Translations> = { ko, en };

function getInitialLocale(): Locale {
	if (browser) {
		const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
		if (stored === 'ko' || stored === 'en') {
			return stored;
		}
	}
	return 'ko';
}

export const locale = writable<Locale>(getInitialLocale());

export function setLocale(newLocale: Locale): void {
	locale.set(newLocale);
	if (browser) {
		localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
	}
}

export const t = derived(locale, ($locale) => {
	return translations[$locale];
});

export function getTranslations(loc: Locale): Translations {
	return translations[loc];
}

export function getCurrentLocale(): Locale {
	return get(locale);
}

export type { Locale, Translations };
