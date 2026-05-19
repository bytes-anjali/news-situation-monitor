import { SUMMARIZE_WORKER_URL } from '$lib/config/api';

export interface ArticleSummary {
	title: string;
	summary: string;
}

// Promise cache keyed by URL — dedupes concurrent requests for the same article
const cache = new Map<string, Promise<ArticleSummary>>();

export function fetchSummary(articleUrl: string): Promise<ArticleSummary> {
	if (cache.has(articleUrl)) return cache.get(articleUrl)!;

	const promise = (async (): Promise<ArticleSummary> => {
		const res = await fetch(
			`${SUMMARIZE_WORKER_URL}?url=${encodeURIComponent(articleUrl)}`,
			{ signal: AbortSignal.timeout(20000) }
		);
		if (!res.ok) throw new Error(`Summarize worker: ${res.status}`);
		const data = await res.json();
		if (data.error) throw new Error(data.error);
		return data as ArticleSummary;
	})();

	// Remove from cache on failure so retries are possible
	promise.catch(() => cache.delete(articleUrl));
	cache.set(articleUrl, promise);
	return promise;
}
