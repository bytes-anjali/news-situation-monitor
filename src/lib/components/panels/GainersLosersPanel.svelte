<script lang="ts">
	import Panel from '$lib/components/common/Panel.svelte';
	import { markets } from '$lib/stores';

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
	{#snippet actions()}
		<button
			class="check-btn"
			onclick={onRefresh}
			disabled={$markets.gainersLoading}
			title="Fetch today's gainers & losers"
		>
			↻ Check Today
		</button>
	{/snippet}

	<div class="gl-grid">
		<div class="col">
			<div class="col-header gainers-header">Gainers</div>
			{#if $markets.gainers.length > 0}
				{#each $markets.gainers as stock}
					<div class="stock-row">
						<div class="stock-left">
							<span class="stock-name">{stock.name}</span>
							<span class="stock-price">₹{fmtPrice(stock.price)}</span>
						</div>
						<span class="stock-pct up">{fmtPct(stock.changePercent)}</span>
					</div>
				{/each}
			{:else if !$markets.gainersLoading}
				<div class="empty-col">Click "Check Today"</div>
			{/if}
		</div>

		<div class="divider"></div>

		<div class="col">
			<div class="col-header losers-header">Losers</div>
			{#if $markets.losers.length > 0}
				{#each $markets.losers as stock}
					<div class="stock-row">
						<div class="stock-left">
							<span class="stock-name">{stock.name}</span>
							<span class="stock-price">₹{fmtPrice(stock.price)}</span>
						</div>
						<span class="stock-pct down">{fmtPct(stock.changePercent)}</span>
					</div>
				{/each}
			{:else if !$markets.gainersLoading}
				<div class="empty-col">Click "Check Today"</div>
			{/if}
		</div>
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
		padding: 0.3rem 0;
		border-bottom: 1px solid var(--border);
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

	.check-btn {
		font-size: 0.55rem;
		font-family: inherit;
		padding: 0.2rem 0.5rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 3px;
		color: var(--text-dim);
		cursor: pointer;
		transition: all 0.15s;
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
