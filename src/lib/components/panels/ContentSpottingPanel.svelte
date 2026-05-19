<script lang="ts">
	import { untrack } from 'svelte';
	import Panel from '$lib/components/common/Panel.svelte';
	import { news } from '$lib/stores';
	import { INDIAN_NEWS_FEEDS } from '$lib/config/feeds';
	import { fetchSummary, type ArticleSummary } from '$lib/api/summarize';
	import type { TrendItem } from '$lib/api/trends';
	import type { NewsCategory } from '$lib/types';

	interface Props {
		onRefresh?: () => void;
		trends?: TrendItem[];
	}

	let { onRefresh, trends = [] }: Props = $props();

	type Tab = 'all' | NewsCategory;
	let activeTab = $state<Tab>('all');

	const TABS: { id: Tab; label: string }[] = [
		{ id: 'all', label: 'All' },
		{ id: 'stocks', label: 'Stocks' },
		{ id: 'mutual-funds', label: 'Mutual Funds' },
		{ id: 'personal-finance', label: 'Personal Finance' },
		{ id: 'other', label: 'Other' }
	];

	const CAT_COLORS: Record<NewsCategory, string> = {
		stocks: '#58a6ff',
		'mutual-funds': '#3fb950',
		'personal-finance': '#d29922',
		other: '#8b949e'
	};

	const CAT_LABELS: Record<NewsCategory, string> = {
		stocks: 'Stocks',
		'mutual-funds': 'Mutual Funds',
		'personal-finance': 'Personal Finance',
		other: 'Other'
	};

	function relativeTime(date: Date): string {
		const diff = Date.now() - date.getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		return `${Math.floor(hrs / 24)}d ago`;
	}

	const feedColors = Object.fromEntries(INDIAN_NEWS_FEEDS.map((f) => [f.id, f.color]));

	function getMatchingTrend(headline: string): TrendItem | null {
		if (trends.length === 0) return null;
		const lower = headline.toLowerCase();
		for (const trend of trends) {
			const words = trend.title
				.toLowerCase()
				.replace(/[^\w\s]/g, '')
				.split(/\s+/)
				.filter((w) => w.length > 3);
			if (words.some((w) => lower.includes(w))) return trend;
		}
		return null;
	}

	const filteredCards = $derived.by(() => {
		const cards =
			activeTab === 'all' ? $news.cards : $news.cards.filter((c) => c.category === activeTab);
		const trending = cards.filter((c) => getMatchingTrend(c.headline) !== null);
		const regular = cards.filter((c) => getMatchingTrend(c.headline) === null);
		return [...trending, ...regular];
	});

	function tabCount(id: Tab): number {
		if (id === 'all') return $news.cards.length;
		return $news.cards.filter((c) => c.category === id).length;
	}

	// ── AI Summaries ────────────────────────────────────────────────────────────
	type SumState =
		| { s: 'idle' }
		| { s: 'loading' }
		| { s: 'done'; title: string; summary: string }
		| { s: 'error' };

	// Keyed by first-source URL (stable across refreshes)
	let sums = $state<Record<string, SumState>>({});

	$effect(() => {
		const cards = filteredCards; // reactive dep — re-runs when cards change
		untrack(() => {
			for (const card of cards) {
				const url = card.sources[0]?.url;
				if (!url || sums[url]) continue;
				sums[url] = { s: 'loading' };
				fetchSummary(url)
					.then((r: ArticleSummary) => {
						sums[url] = { s: 'done', ...r };
					})
					.catch(() => {
						sums[url] = { s: 'error' };
					});
			}
		});
	});
</script>

<Panel
	id="news"
	title="Content Spotting"
	count={$news.cards.length}
	loading={$news.loading}
	error={$news.error}
>
	{#snippet header()}
		<div class="feed-legend">
			{#each INDIAN_NEWS_FEEDS as feed}
				<span class="feed-dot" style="color:{feed.color}">● {feed.name}</span>
			{/each}
		</div>
	{/snippet}

	<div class="news-toolbar">
		<button
			class="refresh-news-btn"
			onclick={onRefresh}
			disabled={$news.loading}
			title="Manually refresh news"
		>
			↻ Refresh News
		</button>
		{#if $news.lastUpdated}
			<span class="news-updated">
				Updated {new Date($news.lastUpdated).toLocaleTimeString([], {
					hour: 'numeric',
					minute: '2-digit'
				})}
			</span>
		{/if}
	</div>

	{#if trends.length > 0}
		<div class="trends-bar">
			<span class="trends-label">🔥 Trending</span>
			{#each trends as t}
				<a
					href={t.shareUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="trend-chip"
					title="View on Google Trends">{t.title}</a
				>
			{/each}
		</div>
	{/if}

	<div class="tabs">
		{#each TABS as tab}
			<button class="tab" class:active={activeTab === tab.id} onclick={() => (activeTab = tab.id)}>
				{tab.label}
				{#if tabCount(tab.id) > 0}
					<span class="tab-count">{tabCount(tab.id)}</span>
				{/if}
			</button>
		{/each}
	</div>

	<div class="cards">
		{#each filteredCards as card (card.id)}
			{@const matchedTrend = getMatchingTrend(card.headline)}
			{@const sumUrl = card.sources[0]?.url}
			{@const sum = sumUrl ? sums[sumUrl] : null}
			<article class="card" class:trending={matchedTrend !== null}>
				<div class="card-top">
					<div class="card-badges">
						<span
							class="cat-badge"
							style="color:{CAT_COLORS[card.category]};border-color:{CAT_COLORS[card.category]}33;background:{CAT_COLORS[card.category]}11"
						>{CAT_LABELS[card.category]}</span>
						{#if matchedTrend !== null}
							<a
								href={matchedTrend.shareUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="trend-badge"
								title="Trending: {matchedTrend.title}"
							>🔥 Trending</a>
						{/if}
					</div>
					<span class="timestamp">{relativeTime(card.timestamp)}</span>
				</div>

				<!-- AI title replaces raw headline when ready -->
				{#if sum?.s === 'done'}
					<p class="headline ai-title">{sum.title}</p>
				{:else}
					<p class="headline">{card.headline}</p>
				{/if}

				<!-- AI Summary -->
				{#if sum?.s === 'loading'}
					<div class="summary-shimmer"></div>
				{:else if sum?.s === 'done'}
					<p class="summary">{sum.summary}</p>
				{/if}

				<div class="card-sources">
					{#each card.sources as src}
						<a
							href={src.url}
							target="_blank"
							rel="noopener noreferrer"
							class="source-chip"
							style="--chip-color:{feedColors[src.feedId] ?? '#888'}"
						>
							<span class="dot">●</span>{src.name}
						</a>
					{/each}
				</div>

				<div class="angle">{card.angle}</div>
			</article>
		{/each}

		{#if filteredCards.length === 0 && !$news.loading}
			<div class="empty">
				{$news.cards.length === 0
					? 'Click Refresh News to load stories'
					: 'No stories in this category yet'}
			</div>
		{/if}
	</div>
</Panel>

<style>
	.feed-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.35rem;
	}

	.feed-dot {
		font-size: 0.6rem;
	}

	.news-toolbar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.6rem;
	}

	.refresh-news-btn {
		font-size: 0.65rem;
		font-family: inherit;
		padding: 0.3rem 0.7rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 4px;
		color: var(--text-dim);
		cursor: pointer;
		transition: all 0.15s;
		flex-shrink: 0;
	}

	.refresh-news-btn:hover:not(:disabled) {
		background: var(--border);
		color: var(--text);
	}

	.refresh-news-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.news-updated {
		font-size: 0.6rem;
		color: var(--text-muted);
	}

	.trends-bar {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.35rem;
		background: rgba(210, 153, 34, 0.07);
		border: 1px solid rgba(210, 153, 34, 0.18);
		border-radius: 5px;
		padding: 0.4rem 0.6rem;
		margin-bottom: 0.75rem;
	}

	.trends-label {
		font-size: 0.6rem;
		font-weight: 700;
		color: var(--yellow);
		flex-shrink: 0;
		margin-right: 0.15rem;
	}

	.trend-chip {
		font-size: 0.6rem;
		color: var(--text-dim);
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 0.15rem 0.5rem;
		text-decoration: none;
		white-space: nowrap;
		transition: border-color 0.15s, color 0.15s;
	}

	.trend-chip:hover {
		border-color: var(--yellow);
		color: var(--yellow);
		text-decoration: none;
	}

	.tabs {
		display: flex;
		gap: 0.2rem;
		margin-bottom: 0.75rem;
		border-bottom: 1px solid var(--border);
		padding-bottom: 0.4rem;
		flex-wrap: wrap;
	}

	.tab {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.62rem;
		font-family: inherit;
		font-weight: 500;
		padding: 0.25rem 0.6rem;
		border: 1px solid transparent;
		border-radius: 4px;
		color: var(--text-muted);
		background: transparent;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}

	.tab:hover {
		color: var(--text-dim);
		border-color: var(--border);
	}

	.tab.active {
		color: var(--text);
		background: var(--border);
		border-color: var(--border-light);
	}

	.tab-count {
		font-size: 0.55rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 0 0.3rem;
		color: var(--text-muted);
	}

	.tab.active .tab-count {
		background: var(--surface);
	}

	.cards {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.card {
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 5px;
		padding: 0.75rem 0.9rem;
		transition: border-color 0.15s;
	}

	.card:hover {
		border-color: var(--border-light);
	}

	.card.trending {
		border-left: 3px solid rgba(210, 153, 34, 0.55);
	}

	.card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.45rem;
		gap: 0.5rem;
	}

	.card-badges {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		flex-wrap: wrap;
	}

	.cat-badge {
		font-size: 0.52rem;
		font-weight: 700;
		border: 1px solid;
		border-radius: 3px;
		padding: 0.1rem 0.4rem;
		white-space: nowrap;
		letter-spacing: 0.01em;
	}

	.trend-badge {
		font-size: 0.52rem;
		font-weight: 700;
		color: var(--yellow);
		background: rgba(210, 153, 34, 0.1);
		border: 1px solid rgba(210, 153, 34, 0.25);
		border-radius: 3px;
		padding: 0.1rem 0.35rem;
		text-decoration: none;
		white-space: nowrap;
	}

	.trend-badge:hover {
		background: rgba(210, 153, 34, 0.18);
		text-decoration: none;
	}

	.timestamp {
		font-size: 0.58rem;
		color: var(--text-muted);
		flex-shrink: 0;
		font-variant-numeric: tabular-nums;
	}

	.headline {
		font-size: 0.84rem;
		font-weight: 500;
		color: var(--text);
		line-height: 1.45;
		margin: 0 0 0.4rem 0;
	}

	.ai-title {
		font-weight: 600;
	}

	/* AI summary */
	.summary {
		font-size: 0.72rem;
		color: var(--text-dim);
		line-height: 1.55;
		margin: 0 0 0.5rem 0;
	}

	.summary-shimmer {
		height: 2.4rem;
		border-radius: 3px;
		margin-bottom: 0.5rem;
		background: linear-gradient(90deg, var(--surface) 25%, var(--border) 50%, var(--surface) 75%);
		background-size: 200% 100%;
		animation: shimmer 1.4s infinite;
	}

	@keyframes shimmer {
		0% { background-position: -200% 0; }
		100% { background-position: 200% 0; }
	}

	.card-sources {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.55rem;
	}

	.source-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		font-size: 0.58rem;
		font-weight: 600;
		color: var(--chip-color);
		text-decoration: none;
		opacity: 0.75;
		transition: opacity 0.12s;
	}

	.source-chip:hover {
		opacity: 1;
		text-decoration: underline;
	}

	.dot {
		font-size: 0.4rem;
	}

	.angle {
		font-size: 0.64rem;
		color: var(--text-dim);
		background: var(--surface);
		border-left: 2px solid var(--border-light);
		border-radius: 0 3px 3px 0;
		padding: 0.35rem 0.55rem;
		line-height: 1.45;
	}

	.empty {
		font-size: 0.7rem;
		color: var(--text-muted);
		text-align: center;
		padding: 2.5rem 1rem;
	}
</style>
