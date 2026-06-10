<script lang="ts">
	import { onMount } from 'svelte';
	import { Header } from '$lib/components/layout';
	import { MarketBar, ContentSpottingPanel } from '$lib/components/panels';
	import { markets, stocksNews, mfNews, pfNews, economicsNews, data, refresh } from '$lib/stores';
	import { fetchCategoryNews } from '$lib/api/news';
	import { fetchMarkets, fetchGainersLosers, fetchBusinessTrends, type TrendItem } from '$lib/api';
	import { fetchDataFeeds } from '$lib/api/dataFeeds';
	import { getNewsRefreshInterval } from '$lib/utils/marketHours';

	let trends = $state<TrendItem[]>([]);

	async function loadMarkets() {
		markets.setLoading(true);
		try {
			const d = await fetchMarkets();
			markets.setMarkets(d.indices, d.sectors);
		} catch (err) {
			markets.setError(String(err));
		}
	}

	async function loadGainersLosers() {
		markets.setGainersLoading(true);
		try {
			const d = await fetchGainersLosers();
			markets.setGainersLosers(d);
		} catch (err) {
			markets.setError(String(err));
		}
	}

	async function loadStocks() {
		stocksNews.setLoading(true);
		try {
			const cards = await fetchCategoryNews('stocks');
			stocksNews.setCards(cards);
		} catch (err) {
			stocksNews.setError(String(err));
		}
	}

	async function loadMF() {
		mfNews.setLoading(true);
		try {
			const cards = await fetchCategoryNews('mutual-funds');
			mfNews.setCards(cards);
		} catch (err) {
			mfNews.setError(String(err));
		}
	}

	async function loadPF() {
		pfNews.setLoading(true);
		try {
			const cards = await fetchCategoryNews('personal-finance');
			pfNews.setCards(cards);
		} catch (err) {
			pfNews.setError(String(err));
		}
	}

	async function loadEconomics() {
		economicsNews.setLoading(true);
		try {
			const cards = await fetchCategoryNews('economics');
			economicsNews.setCards(cards);
		} catch (err) {
			economicsNews.setError(String(err));
		}
	}

	async function loadTrends() {
		try { trends = await fetchBusinessTrends(); } catch { /* silent */ }
	}

	async function loadDataFeeds() {
		data.setLoading(true);
		try {
			const cards = await fetchDataFeeds();
			data.setCards(cards);
		} catch (err) {
			data.setError(String(err));
		}
	}

	// Initial load: stocks + markets only. Other categories load on user demand.
	async function handleRefresh() {
		refresh.startRefresh();
		const safetyTimer = setTimeout(() => refresh.endRefresh(['Refresh timed out']), 45000);
		try {
			await loadMarkets();
			await loadGainersLosers();
			refresh.nextStage();
			await Promise.all([loadStocks(), loadTrends()]);
			refresh.endRefresh();
		} catch (err) {
			refresh.endRefresh([String(err)]);
		} finally {
			clearTimeout(safetyTimer);
		}
	}

	async function silentRefreshMarkets() {
		try {
			const d = await fetchMarkets();
			markets.setMarkets(d.indices, d.sectors);
		} catch { /* silent */ }
	}

	async function silentRefreshStocks() {
		try {
			const [cards] = await Promise.all([fetchCategoryNews('stocks'), loadTrends()]);
			stocksNews.mergeCards(cards); // keeps articles up to 36 hrs, adds new ones
		} catch { /* silent */ }
	}

	const MARKET_REFRESH_MS = 60 * 1000;

	onMount(() => {
		const API_BASE = (import.meta.env?.VITE_API_URL ?? '').replace(/\/$/, '');
		if (API_BASE) fetch(`${API_BASE}/health`).catch(() => {});

		handleRefresh();

		const marketTimer = setInterval(silentRefreshMarkets, MARKET_REFRESH_MS);

		// Stocks auto-refresh: 20 min during market hours, 3 hr post-market
		let stocksTimer: ReturnType<typeof setTimeout> | null = null;
		function scheduleStocksRefresh() {
			stocksTimer = setTimeout(async () => {
				await silentRefreshStocks();
				scheduleStocksRefresh();
			}, getNewsRefreshInterval());
		}
		scheduleStocksRefresh();

		return () => {
			clearInterval(marketTimer);
			if (stocksTimer) clearTimeout(stocksTimer);
		};
	});
</script>

<svelte:head>
	<title>AngelOne Bytes — Content Dashboard</title>
	<meta name="description" content="Indian stock market and finance content spotting dashboard" />
</svelte:head>

<div class="app">
	<Header onRefresh={handleRefresh} />

	<main class="main-content">
		<div class="layout">
			<MarketBar onRefreshGainers={loadGainersLosers} />
			<ContentSpottingPanel
				onRefreshStocks={loadStocks}
				onRefreshMF={loadMF}
				onRefreshPF={loadPF}
				onRefreshEconomics={loadEconomics}
				onRefreshData={loadDataFeeds}
				{trends}
			/>
		</div>
	</main>
</div>

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--bg);
	}

	.main-content {
		flex: 1;
		overflow-y: auto;
	}

	.layout {
		display: flex;
		flex-direction: column;
		padding: 0.5rem;
		box-sizing: border-box;
	}
</style>
