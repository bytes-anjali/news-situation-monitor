import { writable } from 'svelte/store';
import type { NewsCard } from '$lib/types';

interface DataState {
	cards: NewsCard[];
	loading: boolean;
	error: string | null;
	lastUpdated: number | null;
}

function createDataStore() {
	const { subscribe, update } = writable<DataState>({
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

export const data = createDataStore();
