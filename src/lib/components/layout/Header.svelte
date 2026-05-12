<script lang="ts">
	import { onMount } from 'svelte';
	import { isRefreshing, lastRefresh } from '$lib/stores';
	import { getMarketStatus, marketStatusLabel, type MarketStatus } from '$lib/utils/marketHours';

	interface Props {
		onRefresh?: () => void;
	}

	let { onRefresh }: Props = $props();

	let marketStatus = $state<MarketStatus>(getMarketStatus());

	const lastRefreshText = $derived(
		$lastRefresh
			? `Updated ${new Date($lastRefresh).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
			: 'Not yet refreshed'
	);

	onMount(() => {
		const timer = setInterval(() => {
			marketStatus = getMarketStatus();
		}, 60 * 1000);
		return () => clearInterval(timer);
	});
</script>

<header class="header">
	<div class="header-left">
		<div class="logo-wrap">
			<span class="logo-main">AngelOne Bytes</span>
			<span class="logo-sub">Content Dashboard</span>
		</div>
	</div>

	<div class="header-center">
		{#if $isRefreshing}
			<span class="status loading">Refreshing...</span>
		{:else}
			<span class="status">{lastRefreshText}</span>
		{/if}
	</div>

	<div class="header-right">
		<span class="market-badge" class:open={marketStatus === 'open'} class:closed={marketStatus !== 'open'}>
			<span class="badge-dot"></span>
			{marketStatusLabel(marketStatus)}
		</span>
		<button
			class="refresh-btn"
			onclick={onRefresh}
			disabled={$isRefreshing}
			title="Refresh all data"
		>
			<span class="refresh-icon" class:spinning={$isRefreshing}>↻</span>
			<span class="refresh-label">Refresh</span>
		</button>
	</div>
</header>

<style>
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.65rem 1.25rem;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
		box-shadow: 0 1px 0 var(--border);
		position: sticky;
		top: 0;
		z-index: 100;
		gap: 1rem;
	}

	.header-left {
		flex-shrink: 0;
	}

	.logo-wrap {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
	}

	.logo-main {
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--text);
	}

	.logo-sub {
		font-size: 0.65rem;
		color: var(--text-muted);
		letter-spacing: 0.03em;
	}

	.header-center {
		flex: 1;
		display: flex;
		justify-content: center;
	}

	.status {
		font-size: 0.6rem;
		color: var(--text-muted);
	}

	.status.loading {
		color: var(--yellow);
	}

	.header-right {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.market-badge {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.55rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0.2rem 0.5rem;
		border-radius: 3px;
		border: 1px solid var(--border);
	}

	.market-badge.open {
		color: var(--green);
		border-color: var(--green);
	}

	.market-badge.closed {
		color: var(--text-muted);
		border-color: var(--border);
	}

	.badge-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: currentColor;
	}

	.market-badge.open .badge-dot {
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}

	.refresh-btn {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.75rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 4px;
		color: var(--text-dim);
		cursor: pointer;
		font-size: 0.65rem;
		font-family: inherit;
		transition: all 0.15s;
		min-height: 2.5rem;
	}

	.refresh-btn:hover:not(:disabled) {
		background: var(--border);
		color: var(--text);
	}

	.refresh-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.refresh-icon {
		font-size: 0.9rem;
		display: inline-block;
		transition: transform 0.3s;
	}

	.refresh-icon.spinning {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.refresh-label {
		display: none;
	}

	@media (min-width: 480px) {
		.refresh-label {
			display: inline;
		}
	}
</style>
