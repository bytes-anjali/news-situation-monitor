<script lang="ts">
	import { isRefreshing, lastRefresh } from '$lib/stores';

	interface Props {
		onRefresh?: () => void;
	}

	let { onRefresh }: Props = $props();

	const lastRefreshText = $derived(
		$lastRefresh
			? `Updated ${new Date($lastRefresh).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
			: 'Not yet refreshed'
	);
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
		padding: 0.5rem 1rem;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
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
		gap: 0.5rem;
	}

	.logo-main {
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		color: var(--text);
	}

	.logo-sub {
		font-size: 0.6rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
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
