<script lang="ts">
	import Panel from '$lib/components/common/Panel.svelte';
	import { news } from '$lib/stores';
	import { INDIAN_NEWS_FEEDS } from '$lib/config/feeds';
	import type { TrendItem } from '$lib/api/trends';

	interface Props {
		onRefresh?: () => void;
		trends?: TrendItem[];
	}

	let { onRefresh, trends = [] }: Props = $props();

	function relativeTime(date: Date): string {
		const diff = Date.now() - date.getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		const days = Math.floor(hrs / 24);
		return `${days}d ago`;
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

	const sortedCards = $derived.by(() => {
		const trending = $news.cards.filter((c) => getMatchingTrend(c.headline) !== null);
		const regular = $news.cards.filter((c) => getMatchingTrend(c.headline) === null);
		return [...trending, ...regular];
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
				Updated {new Date($news.lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
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
					title="View on Google Trends"
				>{t.title}</a>
			{/each}
		</div>
	{/if}

	<div class="cards">
		{#each sortedCards as card (card.id)}
			{@const matchedTrend = getMatchingTrend(card.headline)}
			<article class="card" class:trending={matchedTrend !== null}>
				<div class="card-top">
					{#if matchedTrend !== null}
						<a
							href={matchedTrend.shareUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="trend-badge"
							title="Trending: {matchedTrend.title}"
						>🔥 Trending</a>
					{:else}
						<span></span>
					{/if}
					<span class="timestamp">{relativeTime(card.timestamp)}</span>
				</div>

				<p class="headline">{card.headline}</p>

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
			</article>
		{/each}

		{#if $news.cards.length === 0 && !$news.loading}
			<div class="empty">Click Refresh News to load stories</div>
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

	/* Google Trends strip */
	.trends-bar {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.35rem;
		background: rgba(210, 153, 34, 0.08);
		border: 1px solid rgba(210, 153, 34, 0.2);
		border-radius: 5px;
		padding: 0.4rem 0.6rem;
		margin-bottom: 0.7rem;
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

	/* News cards */
	.cards {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.card {
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 5px;
		padding: 0.7rem 0.85rem;
		transition: border-color 0.15s;
	}

	.card:hover {
		border-color: var(--border-light);
	}

	.card.trending {
		border-left: 3px solid rgba(210, 153, 34, 0.6);
	}

	.card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.35rem;
		min-height: 1.1rem;
	}

	.trend-badge {
		font-size: 0.55rem;
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
		font-size: 0.82rem;
		font-weight: 500;
		color: var(--text);
		line-height: 1.45;
		margin: 0 0 0.45rem 0;
	}

	.card-sources {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
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

	.empty {
		font-size: 0.7rem;
		color: var(--text-muted);
		text-align: center;
		padding: 2.5rem 1rem;
	}
</style>
