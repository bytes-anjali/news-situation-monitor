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

	<div class="cards">
		{#each sortedCards as card (card.id)}
			{@const matchedTrend = getMatchingTrend(card.headline)}
			<article class="card" class:trending={matchedTrend !== null}>
				<div class="card-top">
					<div class="card-badges">
						{#if matchedTrend !== null}
							<a
								href={matchedTrend.shareUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="trend-badge"
								title="Trending on Google: {matchedTrend.title}"
							>🔥 Trending</a>
						{/if}
					</div>
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
							<span class="source-dot">●</span>{src.name}
						</a>
					{/each}
				</div>
			</article>
		{/each}

		{#if $news.cards.length === 0 && !$news.loading}
			<div class="empty">Click Refresh to load news</div>
		{/if}
	</div>
</Panel>

<style>
	.feed-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.4rem;
	}

	.feed-dot {
		font-size: 0.55rem;
	}

	.news-toolbar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.refresh-news-btn {
		font-size: 0.6rem;
		font-family: inherit;
		padding: 0.25rem 0.6rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 3px;
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
		opacity: 0.5;
		cursor: not-allowed;
	}

	.news-updated {
		font-size: 0.55rem;
		color: var(--text-muted);
	}

	.cards {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.card {
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 3px;
		padding: 0.6rem 0.7rem;
		transition: border-color 0.15s;
	}

	.card:hover {
		border-color: var(--border-light);
	}

	.card.trending {
		border-color: rgba(255, 160, 0, 0.35);
	}

	.card.trending:hover {
		border-color: rgba(255, 160, 0, 0.6);
	}

	.card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.3rem;
		gap: 0.5rem;
		min-height: 1.2rem;
	}

	.card-badges {
		display: flex;
		gap: 0.3rem;
	}

	.trend-badge {
		font-size: 0.5rem;
		font-weight: 700;
		color: #ffa000;
		background: rgba(255, 160, 0, 0.12);
		border: 1px solid rgba(255, 160, 0, 0.3);
		border-radius: 3px;
		padding: 0.1rem 0.35rem;
		text-decoration: none;
		white-space: nowrap;
	}

	.trend-badge:hover {
		background: rgba(255, 160, 0, 0.22);
	}

	.timestamp {
		font-size: 0.55rem;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.headline {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text);
		line-height: 1.4;
		margin: 0 0 0.4rem 0;
	}

	.card-sources {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.source-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		font-size: 0.5rem;
		font-weight: 600;
		color: var(--chip-color);
		text-decoration: none;
		opacity: 0.85;
	}

	.source-chip:hover {
		opacity: 1;
		text-decoration: underline;
	}

	.source-chip .source-dot {
		font-size: 0.45rem;
		line-height: 1;
	}

	.empty {
		font-size: 0.65rem;
		color: var(--text-muted);
		text-align: center;
		padding: 2rem 1rem;
	}
</style>
