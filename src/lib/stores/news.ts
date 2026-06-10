import { writable } from 'svelte/store';
import type { NewsCard } from '$lib/types';

export interface CategoryNewsState {
	cards: NewsCard[];
	loading: boolean;
	error: string | null;
	lastUpdated: number | null;
}

const ACCUMULATE_AGE_MS = 36 * 60 * 60 * 1000;

function createCategoryStore() {
	const { subscribe, update } = writable<CategoryNewsState>({
		cards: [],
		loading: false,
		error: null,
		lastUpdated: null
	});

	return {
		subscribe,
		setLoading(loading: boolean) {
			update((s) => ({ ...s, loading, error: loading ? null : s.error }));
		},
		setCards(cards: NewsCard[]) {
			update((s) => ({ ...s, cards, loading: false, error: null, lastUpdated: Date.now() }));
		},
		// Keeps old cards up to 36 hrs and merges in new ones (used for auto-refresh)
		mergeCards(newCards: NewsCard[]) {
			update((s) => {
				const now = Date.now();
				const freshOld = s.cards.filter(
					(c) => now - new Date(c.timestamp).getTime() <= ACCUMULATE_AGE_MS
				);
				const newKeys = new Set(newCards.map((c) => c.headline.toLowerCase().slice(0, 60)));
				const uniqueOld = freshOld.filter(
					(c) => !newKeys.has(c.headline.toLowerCase().slice(0, 60))
				);
				return {
					...s,
					cards: [...newCards, ...uniqueOld],
					loading: false,
					error: null,
					lastUpdated: Date.now()
				};
			});
		},
		setError(error: string) {
			update((s) => ({ ...s, loading: false, error }));
		}
	};
}

export const stocksNews = createCategoryStore();
export const mfNews    = createCategoryStore();
export const pfNews    = createCategoryStore();
export const economicsNews = createCategoryStore();

export const news = stocksNews;
export type NewsState = CategoryNewsState;
export const isNewsLoading = { subscribe: stocksNews.subscribe };
export const allNewsItems  = { subscribe: stocksNews.subscribe };
export const isLoading     = isNewsLoading;
export const hasErrors     = { subscribe: stocksNews.subscribe };
export const alerts        = { subscribe: (_: (v: unknown[]) => void) => () => {} };
