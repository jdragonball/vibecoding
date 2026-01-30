<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	// 강점/약점 항목 타입
	interface TraitItem {
		title: string;
		description: string;
	}

	// 무료 티저 타입
	interface FreeReport {
		oneLiner: string;
		typeName: string;
		keywords: string[];
		description: string;
		strengths: TraitItem[];
		weaknesses: TraitItem[];
		preview: {
			sectionTitles: string[];
			teaserText: string;
		};
	}

	// 유료 섹션 타입
	interface Section {
		slot: number;
		id: string;
		title: string;
		emoji: string;
		content: string;
		part: number;
	}

	interface SajuData {
		yearPillar: string;
		monthPillar: string;
		dayPillar: string;
		hourPillar: string;
		dayMaster: string;
		dayMasterElement: string;
		dayMasterMeaning: string;
	}

	// 상태
	let isLoading = $state(true);
	let isPaidLoading = $state(false);
	let error = $state<string | null>(null);
	let loadingMessage = $state('사주를 분석하고 있어요');

	// 데이터
	let name = $state('');
	let mbti = $state('');
	let saju = $state<SajuData | null>(null);
	let freeReport = $state<FreeReport | null>(null);
	let paidSections = $state<Section[] | null>(null);
	let paidOneLiner = $state<string | null>(null);
	let freeGenerationTime = $state<string | null>(null);
	let paidGenerationTime = $state<string | null>(null);

	// 원본 요청 데이터 (유료 호출용)
	let originalRequest = $state<Record<string, unknown> | null>(null);

	const loadingMessages = [
		'사주를 분석하고 있어요',
		'오행의 균형을 살펴보고 있어요',
		'MBTI와 연결하고 있어요',
		'당신만의 유형을 찾고 있어요'
	];

	// 고민 유무에 따라 Part 2 라벨 동적 변경
	const getPartLabel = (part: number): string => {
		if (part === 1) return '나를 알기';
		if (part === 2) {
			const concern = originalRequest?.concern as string | undefined;
			return concern?.trim() ? '고민 분석' : '심층 분석';
		}
		if (part === 3) return '앞으로';
		return '';
	};

	// 천간/지지 분리 함수
	function splitPillar(pillar: string): { stem: string; branch: string } {
		if (pillar === '시간 미상') return { stem: '?', branch: '?' };
		return { stem: pillar[0], branch: pillar[1] };
	}

	// 리포트 저장 ID
	let reportId = $state<string | null>(null);

	// 리포트 저장 함수
	function saveReport(reportData: {
		name: string;
		mbti: string;
		saju: SajuData;
		freeReport: FreeReport;
		paidSections?: Section[] | null;
		paidOneLiner?: string | null;
		freeGenerationTime?: string | null;
		paidGenerationTime?: string | null;
	}) {
		if (!browser) return;

		const id = reportId || `report_${Date.now()}`;
		reportId = id;

		const saved = localStorage.getItem('reports');
		const reports = saved ? JSON.parse(saved) : [];

		// 기존 리포트가 있으면 업데이트, 없으면 추가
		const existingIndex = reports.findIndex((r: { id: string }) => r.id === id);
		const reportToSave = {
			id,
			createdAt: new Date().toISOString(),
			data: {
				name: reportData.name,
				mbti: reportData.mbti,
				saju: reportData.saju, // 사주 전체 정보 저장
				report: {
					oneLiner: reportData.paidOneLiner || reportData.freeReport.oneLiner,
					typeName: reportData.freeReport.typeName,
					freeReport: reportData.freeReport,
					paidSections: reportData.paidSections || null
				},
				freeGenerationTime: reportData.freeGenerationTime || null,
				paidGenerationTime: reportData.paidGenerationTime || null
			}
		};

		if (existingIndex >= 0) {
			reports[existingIndex] = reportToSave;
		} else {
			reports.unshift(reportToSave); // 최신순
		}

		// 최대 20개까지만 저장
		if (reports.length > 20) {
			reports.pop();
		}

		localStorage.setItem('reports', JSON.stringify(reports));
	}

	onMount(async () => {
		if (!browser) return;

		// 1. 저장된 리포트 보기 (history에서 왔을 때)
		const viewId = sessionStorage.getItem('viewReportId');
		if (viewId) {
			sessionStorage.removeItem('viewReportId');
			const saved = localStorage.getItem('reports');
			if (saved) {
				const reports = JSON.parse(saved);
				const found = reports.find((r: { id: string }) => r.id === viewId);
				if (found) {
					reportId = found.id;
					name = found.data.name;
					mbti = found.data.mbti;
					saju = found.data.saju;
					freeReport = found.data.report.freeReport;
					freeGenerationTime = found.data.freeGenerationTime || null;
					paidGenerationTime = found.data.paidGenerationTime || null;
					if (found.data.report.paidSections) {
						paidSections = found.data.report.paidSections;
						paidOneLiner = found.data.report.oneLiner;
					}
					isLoading = false;
					return;
				}
			}
			// 저장된 리포트를 찾지 못함
			goto('/history');
			return;
		}

		// 2. 새 리포트 생성 (폼에서 왔을 때)
		const stored = sessionStorage.getItem('reportRequest');

		if (!stored) {
			goto('/');
			return;
		}

		originalRequest = JSON.parse(stored);

		let messageIndex = 0;
		const messageInterval = setInterval(() => {
			messageIndex = (messageIndex + 1) % loadingMessages.length;
			loadingMessage = loadingMessages[messageIndex];
		}, 2000);

		try {
			// 무료 API 호출
			const response = await fetch('/api/generate/free', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: stored
			});

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || '리포트 생성에 실패했어요');
			}

			name = result.data.name;
			mbti = result.data.mbti;
			saju = result.data.saju;
			freeReport = result.data.report;
			freeGenerationTime = result.data.generationTime || null;

			// 무료 리포트 저장
			saveReport({
				name: result.data.name,
				mbti: result.data.mbti,
				saju: result.data.saju,
				freeReport: result.data.report,
				freeGenerationTime: result.data.generationTime || null
			});

			sessionStorage.removeItem('reportRequest');

		} catch (e) {
			error = e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요';
		} finally {
			clearInterval(messageInterval);
			isLoading = false;
		}
	});

	async function unlockPaidReport() {
		if (!originalRequest || !freeReport) return;

		isPaidLoading = true;

		try {
			const response = await fetch('/api/generate/paid', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...originalRequest,
					freeContext: freeReport
				})
			});

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || '리포트 생성에 실패했어요');
			}

			paidOneLiner = result.data.report.oneLiner;
			paidSections = result.data.report.sections;
			paidGenerationTime = result.data.generationTime || null;

			// 유료 리포트 포함하여 저장 (업데이트)
			if (saju && freeReport) {
				saveReport({
					name,
					mbti,
					saju,
					freeReport,
					paidSections: result.data.report.sections,
					paidOneLiner: result.data.report.oneLiner,
					freeGenerationTime,
					paidGenerationTime: result.data.generationTime || null
				});
			}

		} catch (e) {
			error = e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요';
		} finally {
			isPaidLoading = false;
		}
	}

	function parseMarkdown(text: string): string {
		return text
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.*?)\*/g, '<em>$1</em>')
			.replace(/\n\n/g, '</p><p>')
			.replace(/\n/g, '<br>');
	}

	function groupByPart(sections: Section[]): { part: number; label: string; sections: Section[] }[] {
		const grouped: Record<number, Section[]> = {};
		sections.forEach(section => {
			if (!grouped[section.part]) grouped[section.part] = [];
			grouped[section.part].push(section);
		});
		return Object.entries(grouped).map(([part, secs]) => ({
			part: parseInt(part),
			label: getPartLabel(parseInt(part)),
			sections: secs
		}));
	}

	// MBTI 특성 바 데이터
	function getMbtiTraits(mbtiType: string): { label: string; left: string; right: string; value: number }[] {
		const traits = [
			{ label: '에너지', left: 'E', right: 'I', value: mbtiType[0] === 'E' ? 65 : 35 },
			{ label: '인식', left: 'S', right: 'N', value: mbtiType[1] === 'S' ? 65 : 35 },
			{ label: '판단', left: 'T', right: 'F', value: mbtiType[2] === 'T' ? 65 : 35 },
			{ label: '생활', left: 'J', right: 'P', value: mbtiType[3] === 'J' ? 65 : 35 }
		];
		return traits;
	}
</script>

<svelte:head>
	{#if name}
		<title>{name}님의 사용설명서 - 나 사용설명서</title>
	{/if}
</svelte:head>

<main class="page">
	{#if isLoading}
		<div class="loading-container">
			<div class="loading-content">
				<div class="loading-icon">
					<span class="loading-circle"></span>
					<span class="loading-dot"></span>
				</div>
				<p class="loading-message">{loadingMessage}</p>
				<p class="loading-hint text-muted text-sm">잠시만 기다려주세요</p>
			</div>
		</div>

	{:else if error}
		<div class="error-container">
			<div class="error-content card">
				<p class="error-icon">○</p>
				<h2>앗, 문제가 생겼어요</h2>
				<p class="text-muted">{error}</p>
				<button class="btn btn-primary mt-lg" onclick={() => goto('/')}>
					다시 시도하기
				</button>
			</div>
		</div>

	{:else if freeReport && saju}
		<header class="report-header">
			<div class="container">
				<a href="/" class="back-link">
					<span>←</span> 처음으로
				</a>
			</div>
		</header>

		<!-- 사주 원국표 -->
		<section class="saju-section">
			<div class="container">
				<div class="saju-card card">
					<h2 class="saju-title">사주 원국</h2>
					<div class="saju-table">
						<div class="saju-column">
							<span class="saju-label">시주</span>
							<span class="saju-stem">{splitPillar(saju.hourPillar).stem}</span>
							<span class="saju-branch">{splitPillar(saju.hourPillar).branch}</span>
						</div>
						<div class="saju-column">
							<span class="saju-label">일주</span>
							<span class="saju-stem highlight">{splitPillar(saju.dayPillar).stem}</span>
							<span class="saju-branch">{splitPillar(saju.dayPillar).branch}</span>
						</div>
						<div class="saju-column">
							<span class="saju-label">월주</span>
							<span class="saju-stem">{splitPillar(saju.monthPillar).stem}</span>
							<span class="saju-branch">{splitPillar(saju.monthPillar).branch}</span>
						</div>
						<div class="saju-column">
							<span class="saju-label">연주</span>
							<span class="saju-stem">{splitPillar(saju.yearPillar).stem}</span>
							<span class="saju-branch">{splitPillar(saju.yearPillar).branch}</span>
						</div>
					</div>
					<p class="saju-info">
						일간 <strong>{saju.dayMaster}</strong>({saju.dayMasterElement}) · {saju.dayMasterMeaning}
					</p>
				</div>
			</div>
		</section>

		<!-- 히어로 영역 -->
		<section class="report-hero">
			<div class="container">
				<div class="hero-top-badge">
					<span class="hero-mbti">{mbti}</span>
					<span class="hero-saju">{saju.dayMaster}({saju.dayMasterElement})</span>
				</div>
				<p class="type-label">당신의 유형</p>
				<h1 class="type-name-big">{freeReport.typeName}</h1>
				<p class="hero-oneliner">"{freeReport.oneLiner}"</p>

				<div class="keywords">
					{#each freeReport.keywords as keyword}
						<span class="keyword-tag">#{keyword}</span>
					{/each}
				</div>
			</div>
		</section>

		<!-- MBTI 특성 바 -->
		<section class="traits-bar-section">
			<div class="container">
				<div class="traits-bar-card">
					<h3 class="traits-bar-title">성격 특성</h3>
					<div class="traits-bars">
						{#each getMbtiTraits(mbti) as trait}
							<div class="trait-bar-row">
								<span class="trait-bar-left" class:active={trait.value > 50}>{trait.left}</span>
								<div class="trait-bar-track">
									<div
										class="trait-bar-fill"
										class:fill-left={trait.value > 50}
										class:fill-right={trait.value <= 50}
										style="width: {Math.abs(trait.value - 50) * 2}%; {trait.value > 50 ? 'right: 50%' : 'left: 50%'}"
									></div>
									<div class="trait-bar-center"></div>
								</div>
								<span class="trait-bar-right" class:active={trait.value <= 50}>{trait.right}</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</section>

		<!-- 성격 설명 -->
		<section class="description-section">
			<div class="container">
				<div class="description-card card">
					<p class="description-text">{@html parseMarkdown(freeReport.description)}</p>
				</div>
			</div>
		</section>

		<!-- 강점 섹션 -->
		<section class="strength-section">
			<div class="container">
				<div class="section-header-big">
					<span class="section-icon-big">✦</span>
					<h2 class="section-title-big">강점</h2>
				</div>
				<div class="traits-grid-2col">
					{#each freeReport.strengths as item}
						<div class="trait-card-new strength-card">
							<div class="trait-check strength-check">✓</div>
							<div class="trait-content">
								<h4 class="trait-title-new">{item.title}</h4>
								<p class="trait-desc-new">{item.description}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- 약점 섹션 -->
		<section class="weakness-section">
			<div class="container">
				<div class="section-header-big">
					<span class="section-icon-big">○</span>
					<h2 class="section-title-big">약점</h2>
				</div>
				<div class="traits-grid-2col">
					{#each freeReport.weaknesses as item}
						<div class="trait-card-new weakness-card">
							<div class="trait-check weakness-check">!</div>
							<div class="trait-content">
								<h4 class="trait-title-new">{item.title}</h4>
								<p class="trait-desc-new">{item.description}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- 유료 섹션이 있으면 표시 -->
		{#if paidSections}
			<div class="report-content">
				<div class="container">
					{#each groupByPart(paidSections) as group}
						<div class="part-group">
							<div class="part-header">
								<span class="part-number">Part {group.part}</span>
								<span class="part-label">{group.label}</span>
							</div>

							{#each group.sections as section}
								<article
									id={section.id}
									class="report-section card"
									class:animate-fade-in={true}
									style="animation-delay: {(section.slot - 1) * 0.05}s"
								>
									<header class="section-header">
										<span class="section-emoji">{section.emoji}</span>
										<h2 class="section-title">{section.title}</h2>
									</header>
									<div class="section-content">
										<p>{@html parseMarkdown(section.content)}</p>
									</div>
								</article>
							{/each}
						</div>
					{/each}
				</div>
			</div>

		{:else}
			<!-- 유료 유도 영역 -->
			<section class="paid-teaser">
				<div class="container">
					<div class="teaser-card card">
						<div class="teaser-header">
							<span class="teaser-badge">심층 분석 준비 완료</span>
							<h2 class="teaser-title">{name}님만을 위한<br/>맞춤 분석이 기다리고 있어요</h2>
							<p class="teaser-subtitle">{freeReport.preview.teaserText}</p>
						</div>

						<!-- 블러된 섹션 미리보기 -->
						<div class="preview-sections">
							{#each freeReport.preview.sectionTitles as title, i}
								<div class="preview-item">
									<span class="preview-number">{i + 1}</span>
									<span class="preview-title">{title}</span>
									<span class="preview-lock">🔒</span>
								</div>
							{/each}
						</div>

						<div class="teaser-cta">
							<p class="price-display">
								<span class="price-original">19,900원</span>
								<span class="price-current">9,900원</span>
							</p>
							<button
								class="btn btn-primary unlock-btn"
								onclick={unlockPaidReport}
								disabled={isPaidLoading}
							>
								{#if isPaidLoading}
									<span class="spinner"></span>
									분석 중...
								{:else}
									전체 리포트 열기
								{/if}
							</button>
							<p class="social-proof">오늘 {Math.floor(Math.random() * 100) + 50}명이 리포트를 받았어요</p>
						</div>
					</div>
				</div>
			</section>
		{/if}

		<footer class="report-footer">
			<div class="container">
				<p class="text-muted text-sm text-center">
					◎ 나 사용설명서 · 사주 × MBTI 기반 맞춤형 인생 가이드
				</p>
				{#if freeGenerationTime || paidGenerationTime}
					<div class="generation-time">
						{#if freeGenerationTime}
							<span>무료 리포트 생성: {freeGenerationTime}초</span>
						{/if}
						{#if paidGenerationTime}
							<span>유료 리포트 생성: {paidGenerationTime}초</span>
						{/if}
					</div>
				{/if}
			</div>
		</footer>
	{/if}
</main>

<style>
	.page {
		min-height: 100vh;
	}

	.loading-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.loading-content {
		text-align: center;
	}

	.loading-icon {
		position: relative;
		width: 60px;
		height: 60px;
		margin: 0 auto var(--space-xl);
	}

	.loading-circle {
		position: absolute;
		inset: 0;
		border: 2px solid var(--border-light);
		border-top-color: var(--accent-warm);
		border-radius: 50%;
		animation: spin 1.2s linear infinite;
	}

	.loading-dot {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 8px;
		height: 8px;
		background: var(--accent-warm);
		border-radius: 50%;
		animation: pulse 1.5s ease-in-out infinite;
	}

	.loading-message {
		font-size: var(--font-size-lg);
		font-weight: 500;
		margin-bottom: var(--space-sm);
	}

	.error-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
	}

	.error-content {
		text-align: center;
		max-width: 400px;
	}

	.error-icon {
		font-size: 3rem;
		color: var(--accent-clay);
		margin-bottom: var(--space-md);
	}

	.report-header {
		padding: var(--space-lg) 0;
		border-bottom: 1px solid var(--border-light);
		background: var(--bg-card);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
	}

	.back-link:hover {
		color: var(--text-primary);
	}

	/* 사주 원국표 - 컴팩트 */
	.saju-section {
		padding: var(--space-lg) 0;
		background: var(--bg-card);
		border-bottom: 1px solid var(--border-light);
	}

	.saju-card {
		max-width: 500px;
		margin: 0 auto;
		text-align: center;
		padding: var(--space-md);
	}

	.saju-title {
		font-size: var(--font-size-xs);
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-md);
	}

	.saju-table {
		display: flex;
		justify-content: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.saju-column {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.saju-label {
		font-size: 10px;
		color: var(--text-muted);
	}

	.saju-stem, .saju-branch {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--font-size-lg);
		font-weight: 600;
		border: 1px solid var(--border-light);
		border-radius: var(--radius-sm);
		background: var(--bg-secondary);
	}

	.saju-stem.highlight {
		background: var(--accent-warm);
		color: white;
		border-color: var(--accent-warm);
	}

	.saju-info {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.saju-info strong {
		color: var(--accent-warm);
	}

	/* 히어로 - 16personalities 스타일 */
	.report-hero {
		padding: var(--space-3xl) 0 var(--space-2xl);
		text-align: center;
		background: linear-gradient(180deg, var(--bg-accent) 0%, var(--bg-primary) 100%);
	}

	.hero-top-badge {
		display: flex;
		justify-content: center;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
	}

	.hero-mbti {
		padding: var(--space-sm) var(--space-lg);
		background: var(--accent-warm);
		color: white;
		font-weight: 700;
		font-size: var(--font-size-lg);
		border-radius: var(--radius-md);
		letter-spacing: 0.05em;
	}

	.hero-saju {
		padding: var(--space-sm) var(--space-lg);
		background: var(--bg-card);
		border: 2px solid var(--accent-warm);
		color: var(--accent-warm);
		font-weight: 600;
		font-size: var(--font-size-lg);
		border-radius: var(--radius-md);
	}

	.type-label {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		margin-bottom: var(--space-sm);
	}

	.type-name-big {
		font-size: clamp(2rem, 8vw, 3.5rem);
		font-weight: 800;
		color: var(--accent-warm);
		margin-bottom: var(--space-md);
		line-height: 1.2;
	}

	.hero-oneliner {
		font-size: var(--font-size-xl);
		color: var(--text-secondary);
		font-style: italic;
		margin-bottom: var(--space-xl);
		max-width: 600px;
		margin-left: auto;
		margin-right: auto;
	}

	.keywords {
		display: flex;
		justify-content: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.keyword-tag {
		padding: var(--space-sm) var(--space-md);
		background: var(--bg-card);
		border: 1px solid var(--border-light);
		border-radius: var(--radius-full);
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		font-weight: 500;
	}

	/* MBTI 특성 바 */
	.traits-bar-section {
		padding: var(--space-2xl) 0;
		background: var(--bg-primary);
	}

	.traits-bar-card {
		max-width: 500px;
		margin: 0 auto;
		background: var(--bg-card);
		border-radius: var(--radius-lg);
		padding: var(--space-xl);
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
	}

	.traits-bar-title {
		text-align: center;
		font-size: var(--font-size-sm);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--text-muted);
		margin-bottom: var(--space-xl);
	}

	.traits-bars {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.trait-bar-row {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.trait-bar-left,
	.trait-bar-right {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: var(--font-size-sm);
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		background: var(--bg-secondary);
	}

	.trait-bar-left.active,
	.trait-bar-right.active {
		background: var(--accent-warm);
		color: white;
	}

	.trait-bar-track {
		flex: 1;
		height: 8px;
		background: var(--bg-secondary);
		border-radius: var(--radius-full);
		position: relative;
		overflow: hidden;
	}

	.trait-bar-fill {
		position: absolute;
		top: 0;
		height: 100%;
		background: var(--accent-warm);
		border-radius: var(--radius-full);
	}

	.trait-bar-center {
		position: absolute;
		left: 50%;
		top: -2px;
		bottom: -2px;
		width: 2px;
		background: var(--border-light);
		transform: translateX(-50%);
	}

	/* 성격 설명 - 16personalities 스타일 */
	.description-section {
		padding: var(--space-3xl) 0;
		background: var(--bg-secondary);
	}

	.description-card {
		max-width: 720px;
		margin: 0 auto;
		padding: var(--space-2xl);
		background: var(--bg-card);
		border-radius: var(--radius-lg);
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
	}

	.description-text {
		font-size: var(--font-size-lg);
		line-height: 2;
		color: var(--text-primary);
	}

	.description-text :global(p) {
		margin-bottom: var(--space-lg);
	}

	.description-text :global(p:last-child) {
		margin-bottom: 0;
	}

	.description-text :global(strong) {
		color: var(--accent-warm);
		font-weight: 600;
	}

	/* 강점/약점 - 16personalities 스타일 */
	.strength-section {
		padding: var(--space-3xl) 0;
		background: var(--bg-primary);
	}

	.weakness-section {
		padding: var(--space-3xl) 0;
		background: var(--bg-secondary);
	}

	.section-header-big {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
		margin-bottom: var(--space-2xl);
	}

	.section-icon-big {
		font-size: 2rem;
		color: var(--accent-warm);
	}

	.section-title-big {
		font-size: var(--font-size-2xl);
		font-weight: 700;
		color: var(--text-primary);
	}

	.traits-grid-2col {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-lg);
		max-width: 900px;
		margin: 0 auto;
	}

	.trait-card-new {
		display: flex;
		gap: var(--space-md);
		padding: var(--space-lg);
		background: var(--bg-card);
		border-radius: var(--radius-lg);
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.trait-card-new:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
	}

	.trait-check {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		font-weight: 700;
		flex-shrink: 0;
	}

	.strength-check {
		background: rgba(212, 165, 116, 0.15);
		color: var(--accent-warm);
	}

	.weakness-check {
		background: rgba(100, 100, 100, 0.1);
		color: var(--text-muted);
	}

	.trait-content {
		flex: 1;
	}

	.trait-title-new {
		font-size: var(--font-size-base);
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: var(--space-xs);
	}

	.trait-desc-new {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		line-height: 1.6;
	}

	/* 유료 유도 영역 - 16personalities 스타일 */
	.paid-teaser {
		padding: var(--space-3xl) 0;
		background: linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-accent) 100%);
	}

	.teaser-card {
		max-width: 560px;
		margin: 0 auto;
		padding: var(--space-2xl) var(--space-xl);
		text-align: center;
		background: var(--bg-card);
		border-radius: var(--radius-xl);
		box-shadow: 0 8px 40px rgba(0, 0, 0, 0.1);
	}

	.teaser-badge {
		display: inline-block;
		padding: var(--space-sm) var(--space-lg);
		background: var(--accent-warm);
		color: white;
		font-size: var(--font-size-sm);
		font-weight: 700;
		border-radius: var(--radius-full);
		margin-bottom: var(--space-xl);
	}

	.teaser-title {
		font-size: var(--font-size-2xl);
		font-weight: 700;
		line-height: 1.4;
		margin-bottom: var(--space-md);
		color: var(--text-primary);
	}

	.teaser-subtitle {
		color: var(--text-secondary);
		margin-bottom: var(--space-2xl);
		font-size: var(--font-size-base);
		line-height: 1.6;
	}

	.preview-sections {
		margin-bottom: var(--space-2xl);
	}

	.preview-item {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		background: var(--bg-secondary);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-sm);
		transition: transform 0.2s;
	}

	.preview-item:hover {
		transform: translateX(4px);
	}

	.preview-number {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--accent-warm);
		color: white;
		border-radius: 50%;
		font-size: var(--font-size-sm);
		font-weight: 700;
	}

	.preview-title {
		flex: 1;
		text-align: left;
		color: var(--text-primary);
		font-weight: 500;
	}

	.preview-lock {
		font-size: var(--font-size-base);
		opacity: 0.5;
	}

	.teaser-cta {
		margin-top: var(--space-xl);
		padding-top: var(--space-xl);
		border-top: 1px solid var(--border-light);
	}

	.price-display {
		margin-bottom: var(--space-lg);
	}

	.price-original {
		text-decoration: line-through;
		color: var(--text-muted);
		margin-right: var(--space-sm);
		font-size: var(--font-size-lg);
	}

	.price-current {
		font-size: var(--font-size-2xl);
		font-weight: 800;
		color: var(--accent-warm);
	}

	.unlock-btn {
		width: 100%;
		padding: var(--space-lg) var(--space-xl);
		font-size: var(--font-size-lg);
		font-weight: 700;
		border-radius: var(--radius-lg);
	}

	.social-proof {
		margin-top: var(--space-lg);
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	/* 유료 콘텐츠 - 16personalities 스타일 */
	.report-content {
		padding: var(--space-2xl) 0;
	}

	.part-group {
		margin-bottom: var(--space-3xl);
	}

	.part-group:nth-child(odd) {
		background: var(--bg-secondary);
		padding: var(--space-2xl) 0;
		margin-left: calc(-50vw + 50%);
		margin-right: calc(-50vw + 50%);
		padding-left: calc(50vw - 50%);
		padding-right: calc(50vw - 50%);
	}

	.part-header {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
		margin-bottom: var(--space-2xl);
		text-align: center;
	}

	.part-number {
		font-size: var(--font-size-sm);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: white;
		background: var(--accent-warm);
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
	}

	.part-label {
		font-size: var(--font-size-xl);
		font-weight: 700;
		color: var(--text-primary);
	}

	.report-section {
		margin-bottom: var(--space-xl);
		scroll-margin-top: 140px;
		background: var(--bg-card);
		border-radius: var(--radius-lg);
		padding: var(--space-2xl);
		box-shadow: 0 2px 16px rgba(0, 0, 0, 0.04);
		max-width: 720px;
		margin-left: auto;
		margin-right: auto;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		margin-bottom: var(--space-xl);
	}

	.section-emoji {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		background: var(--bg-accent);
		border-radius: var(--radius-md);
		color: var(--accent-warm);
	}

	.section-title {
		font-size: var(--font-size-xl);
		font-weight: 700;
		color: var(--text-primary);
	}

	.section-content {
		color: var(--text-primary);
		line-height: 2;
		font-size: var(--font-size-base);
	}

	.section-content :global(p) {
		margin-bottom: var(--space-lg);
	}

	.section-content :global(p:last-child) {
		margin-bottom: 0;
	}

	.section-content :global(strong) {
		font-weight: 600;
		color: var(--accent-warm);
	}

	.report-footer {
		padding: var(--space-2xl) 0;
		border-top: 1px solid var(--border-light);
	}

	.generation-time {
		display: flex;
		justify-content: center;
		gap: var(--space-lg);
		margin-top: var(--space-md);
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		opacity: 0.7;
	}

	.generation-time span {
		padding: var(--space-xs) var(--space-sm);
		background: var(--bg-secondary);
		border-radius: var(--radius-sm);
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
		50% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.8); }
	}
</style>
