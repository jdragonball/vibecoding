<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	interface SavedReport {
		id: string;
		createdAt: string;
		data: {
			name: string;
			mbti: string;
			saju: {
				dayMaster: string;
				dayMasterElement: string;
			};
			report: {
				oneLiner: string;
			};
		};
	}

	let reports = $state<SavedReport[]>([]);

	onMount(() => {
		if (!browser) return;
		const saved = localStorage.getItem('reports');
		if (saved) {
			reports = JSON.parse(saved);
		}
	});

	function viewReport(id: string) {
		sessionStorage.setItem('viewReportId', id);
		goto('/report');
	}

	function deleteReport(id: string) {
		reports = reports.filter(r => r.id !== id);
		localStorage.setItem('reports', JSON.stringify(reports));
	}

	function clearAll() {
		if (confirm('전체 삭제할까요?')) {
			reports = [];
			localStorage.removeItem('reports');
		}
	}

	function formatDate(iso: string) {
		const d = new Date(iso);
		return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
	}
</script>

<main class="page">
	<header class="header">
		<div class="container header-inner">
			<a href="/" class="back-link">
				<span>←</span> 홈
			</a>
			<h1 class="page-title">저장된 리포트</h1>
			{#if reports.length > 0}
				<button class="btn-text" onclick={clearAll}>전체 삭제</button>
			{:else}
				<div></div>
			{/if}
		</div>
	</header>

	<section class="content">
		<div class="container">
			{#if reports.length === 0}
				<div class="empty-state card">
					<p class="empty-icon">○</p>
					<p class="text-muted">아직 저장된 리포트가 없어요</p>
					<button class="btn btn-primary mt-lg" onclick={() => goto('/')}>
						리포트 만들러 가기
					</button>
				</div>
			{:else}
				<ul class="report-list">
					{#each reports as report}
						<li class="report-item card">
							<button class="report-main" onclick={() => viewReport(report.id)}>
								<div class="report-header">
									<span class="report-name">{report.data.name}</span>
									<span class="report-tags">
										<span class="tag">{report.data.mbti}</span>
										<span class="tag">{report.data.saju.dayMaster}{report.data.saju.dayMasterElement}</span>
									</span>
								</div>
								<p class="report-oneliner">{report.data.report.oneLiner}</p>
								<p class="report-date text-muted text-sm">{formatDate(report.createdAt)}</p>
							</button>
							<button class="btn-delete" onclick={() => deleteReport(report.id)} title="삭제">
								×
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>
</main>

<style>
	.page {
		min-height: 100vh;
	}

	.header {
		padding: var(--space-lg) 0;
		border-bottom: 1px solid var(--border-light);
		background: var(--bg-card);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.header-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
	}

	.page-title {
		font-size: var(--font-size-lg);
		font-weight: 600;
	}

	.btn-text {
		background: none;
		border: none;
		color: var(--accent-clay);
		font-size: var(--font-size-sm);
		cursor: pointer;
		font-family: var(--font-family);
	}

	.content {
		padding: var(--space-xl) 0;
	}

	.empty-state {
		text-align: center;
		padding: var(--space-3xl);
	}

	.empty-icon {
		font-size: 3rem;
		color: var(--text-muted);
		margin-bottom: var(--space-md);
	}

	.report-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.report-item {
		display: flex;
		align-items: stretch;
		padding: 0;
		overflow: hidden;
	}

	.report-main {
		flex: 1;
		padding: var(--space-lg);
		text-align: left;
		background: none;
		border: none;
		cursor: pointer;
		font-family: var(--font-family);
	}

	.report-main:hover {
		background: var(--bg-secondary);
	}

	.report-header {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		margin-bottom: var(--space-sm);
	}

	.report-name {
		font-weight: 600;
		font-size: var(--font-size-lg);
	}

	.report-tags {
		display: flex;
		gap: var(--space-xs);
	}

	.report-oneliner {
		color: var(--text-secondary);
		margin-bottom: var(--space-sm);
	}

	.btn-delete {
		padding: var(--space-md) var(--space-lg);
		background: none;
		border: none;
		border-left: 1px solid var(--border-light);
		color: var(--text-muted);
		font-size: var(--font-size-xl);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.btn-delete:hover {
		background: var(--accent-clay);
		color: white;
	}
</style>
