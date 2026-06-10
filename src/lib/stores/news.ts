import { writable } from 'svelte/store';
import type { NewsCard } from '$lib/types';

export interface CategoryNewsState {
	cards: NewsCard[];
	loading: boolean;
	error: string | null;
	lastUpdated: number | null;
}

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
		setError(error: string) {
			update((s) => ({ ...s, loading: false, error }));
		}
	};
}

export const stocksNews = createCategoryStore();
export const mfNews = createCategoryStore();
export const pfNews = createCategoryStore();
export const economicsNews = createCategoryStore();

// Legacy alias so any code still importing `news` keeps compiling
export const news = stocksNews;
export type NewsState = CategoryNewsState;
export const isNewsLoading = { subscribe: stocksNews.subscribe };
export const allNewsItems = { subscribe: stocksNews.subscribe };
export const isLoading = isNewsLoading;
export const hasErrors = { subscribe: stocksNews.subscribe };
export const alerts = { subscribe: (_: (v: unknown[]) => void) => () => {} };
