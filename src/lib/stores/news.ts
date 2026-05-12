import { writable, derived } from 'svelte/store';
import type { NewsCard } from '$lib/types';

export interface NewsState {
	cards: NewsCard[];
	loading: boolean;
	error: string | null;
	lastUpdated: number | null;
}

function createNewsStore() {
	const { subscribe, update } = writable<NewsState>({
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

export const news = createNewsStore();

export const isNewsLoading = derived(news, ($n) => $n.loading);
export const allNewsItems = derived(news, ($n) => $n.cards);
// Legacy compat
export const isLoading = isNewsLoading;
export const hasErrors = derived(news, ($n) => $n.error !== null);
export const alerts = derived(news, () => []);
