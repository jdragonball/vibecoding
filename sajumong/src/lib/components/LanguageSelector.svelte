<script lang="ts">
	import { locale, setLocale } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';

	const languages: { code: Locale; label: string }[] = [
		{ code: 'ko', label: 'KO' },
		{ code: 'en', label: 'EN' }
	];
</script>

<div class="language-tabs" role="tablist" aria-label="Language selection">
	{#each languages as lang}
		<button
			class="language-tab"
			class:active={$locale === lang.code}
			onclick={() => setLocale(lang.code)}
			role="tab"
			aria-selected={$locale === lang.code}
		>
			{lang.label}
		</button>
	{/each}
</div>

<style>
	.language-tabs {
		display: flex;
		background: var(--gray-100);
		border-radius: 6px;
		padding: 2px;
		gap: 2px;
	}

	.language-tab {
		background: transparent;
		border: none;
		border-radius: 4px;
		color: var(--text-muted);
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
		min-width: 32px;
	}

	.language-tab:hover:not(.active) {
		background: var(--gray-200);
		color: var(--text-secondary);
	}

	.language-tab.active {
		background: var(--surface);
		color: var(--text);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}
</style>
