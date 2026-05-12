<script lang="ts">
	import Panel from '$lib/components/common/Panel.svelte';
	import { markets } from '$lib/stores';
	import { yahooFinanceUrl } from '$lib/api/markets';

	interface Props {
		onRefresh?: () => void;
	}

	let { onRefresh }: Props = $props();

	function fmtPrice(p: number): string {
		return p.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	function fmtPct(pct: number): string {
		const sign = pct >= 0 ? '+' : '';
		return `${sign}${pct.toFixed(2)}%`;
	}
</script>

<Panel id="gainers" title="Top Gainers / Losers" loading={$markets.gainersLoading} error={$markets.error}>
	<div class="gl-grid">
		<div class="col">
			<div class="col-header gainers-header">Gainers</div>
			{#if $markets.gainers.length > 0}
				{#each $markets.gainers as stock}
					<a
						class="stock-row"
						href={yahooFinanceUrl(stock.symbol)}
						target="_blank"
						rel="noopener noreferrer"
					>
						<div class="stock-left">
							<span class="stock-name">{stock.name}</span>
							<span class="stock-price">₹{fmtPrice(stock.price)}</span>
						</div>
						<span class="stock-pct up">{fmtPct(stock.changePercent)}</span>
					</a>
				{/each}
			{:else if !$markets.gainersLoading}
				<div class="empty-col">—</div>
			{/if}
		</div>

		<div class="divider"></div>

		<div class="col">
			<div class="col-header losers-header">Losers</div>
			{#if $markets.losers.length > 0}
				{#each $markets.losers as stock}
					<a
						class="stock-row"
						href={yahooFinanceUrl(stock.symbol)}
						target="_blank"
						rel="noopener noreferrer"
					>
						<div class="stock-left">
							<span class="stock-name">{stock.name}</span>
							<span class="stock-price">₹{fmtPrice(stock.price)}</span>
						</div>
						<span class="stock-pct down">{fmtPct(stock.changePercent)}</span>
					</a>
				{/each}
			{:else if !$markets.gainersLoading}
				<div class="empty-col">—</div>
			{/if}
		</div>
	</div>

	<div class="check-row">
		<button
			class="check-btn"
			onclick={onRefresh}
			disabled={$markets.gainersLoading}
		>
			↻ Check Today
		</button>
	</div>
</Panel>

<style>
	.gl-grid {
		display: grid;
		grid-template-columns: 1fr 1px 1fr;
		gap: 0 0.5rem;
	}

	.divider {
		background: var(--border);
	}

	.col-header {
		font-size: 0.55rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-weight: 700;
		margin-bottom: 0.4rem;
	}

	.gainers-header {
		color: var(--green);
	}

	.losers-header {
		color: var(--red);
	}

	.stock-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.3rem 0.25rem;
		border-bottom: 1px solid var(--border);
		text-decoration: none;
		border-radius: 2px;
		transition: background 0.1s;
	}

	.stock-row:hover {
		background: var(--surface-hover);
		text-decoration: none;
	}

	.stock-row:last-child {
		border-bottom: none;
	}

	.stock-left {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}

	.stock-name {
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.stock-price {
		font-size: 0.55rem;
		color: var(--text-muted);
	}

	.stock-pct {
		font-size: 0.65rem;
		font-weight: 600;
		flex-shrink: 0;
		margin-left: 0.4rem;
	}

	.stock-pct.up {
		color: var(--green);
	}

	.stock-pct.down {
		color: var(--red);
	}

	.empty-col {
		font-size: 0.6rem;
		color: var(--text-muted);
		padding: 0.5rem 0;
	}

	.check-row {
		margin-top: 0.6rem;
		display: flex;
		justify-content: center;
	}

	.check-btn {
		font-size: 0.6rem;
		font-family: inherit;
		padding: 0.3rem 1rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 3px;
		color: var(--text-dim);
		cursor: pointer;
		transition: all 0.15s;
		width: 100%;
	}

	.check-btn:hover:not(:disabled) {
		background: var(--border);
		color: var(--text);
	}

	.check-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
