import { writable, derived } from 'svelte/store';
import type { MarketQuote, StockQuote, GainersLosers } from '$lib/types';

export interface MarketsState {
	indices: MarketQuote[];
	sectors: MarketQuote[];
	gainers: StockQuote[];
	losers: StockQuote[];
	loading: boolean;
	gainersLoading: boolean;
	error: string | null;
	lastUpdated: number | null;
}

function createMarketsStore() {
	const { subscribe, update } = writable<MarketsState>({
		indices: [],
		sectors: [],
		gainers: [],
		losers: [],
		loading: false,
		gainersLoading: false,
		error: null,
		lastUpdated: null
	});

	return {
		subscribe,

		setLoading(loading: boolean) {
			update((s) => ({ ...s, loading, error: loading ? null : s.error }));
		},

		setGainersLoading(loading: boolean) {
			update((s) => ({ ...s, gainersLoading: loading }));
		},

		setMarkets(indices: MarketQuote[], sectors: MarketQuote[]) {
			update((s) => ({
				...s,
				indices,
				sectors,
				loading: false,
				error: null,
				lastUpdated: Date.now()
			}));
		},

		setGainersLosers(gl: GainersLosers) {
			update((s) => ({
				...s,
				gainers: gl.gainers,
				losers: gl.losers,
				gainersLoading: false
			}));
		},

		setError(error: string) {
			update((s) => ({ ...s, loading: false, gainersLoading: false, error }));
		}
	};
}

export const markets = createMarketsStore();

export const indices = derived(markets, ($m) => $m.indices);
export const sectors = derived(markets, ($m) => $m.sectors);
export const isMarketsLoading = derived(markets, ($m) => $m.loading);
export const marketsLastUpdated = derived(markets, ($m) => $m.lastUpdated);
// Keep these exported for backward compat with refresh store
export const commodities = derived(markets, () => ({ items: [], loading: false, error: null, lastUpdated: null }));
export const crypto = derived(markets, () => ({ items: [], loading: false, error: null, lastUpdated: null }));
export const vix = derived(markets, () => null);
