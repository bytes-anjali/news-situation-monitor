import { writable, derived } from 'svelte/store';
import type { NewsCard } from '$lib/types';

export type NewsFilter = 'all' | 'spot' | 'skip';

export interface NewsState {
	cards: NewsCard[];
	loading: boolean;
	error: string | null;
	lastUpdated: number | null;
	filter: NewsFilter;
}

function createNewsStore() {
	const { subscribe, update } = writable<NewsState>({
		cards: [],
		loading: false,
		error: null,
		lastUpdated: null,
		filter: 'all'
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
		},

		setFilter(filter: NewsFilter) {
			update((s) => ({ ...s, filter }));
		}
	};
}

export const news = createNewsStore();

export const filteredNews = derived(news, ($n) => {
	if ($n.filter === 'spot') return $n.cards.filter((c) => c.isSpot);
	if ($n.filter === 'skip') return $n.cards.filter((c) => !c.isSpot);
	return $n.cards;
});

export const isNewsLoading = derived(news, ($n) => $n.loading);
export const newsFilter = derived(news, ($n) => $n.filter);
// Kept for any legacy imports
export const allNewsItems = derived(news, ($n) => $n.cards);
export const isLoading = isNewsLoading;
export const hasErrors = derived(news, ($n) => $n.error !== null);
export const alerts = derived(news, () => []);
