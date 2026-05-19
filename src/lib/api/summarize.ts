export interface ArticleSummary {
	title: string;
	summary: string;
}

// Set VITE_API_URL in Render environment to your Express API service URL
// e.g. https://angelone-api.onrender.com
const API_BASE = import.meta.env.VITE_API_URL ?? '';

// Promise cache keyed by URL — dedupes concurrent requests for the same article
const cache = new Map<string, Promise<ArticleSummary>>();

export function isSummaryEnabled(): boolean {
	return !!API_BASE;
}

export function fetchSummary(articleUrl: string, headline: string): Promise<ArticleSummary> {
	if (cache.has(articleUrl)) return cache.get(articleUrl)!;

	const promise = (async (): Promise<ArticleSummary> => {
		const params = new URLSearchParams({ url: articleUrl, headline });
		const res = await fetch(`${API_BASE}/summarize?${params}`, {
			signal: AbortSignal.timeout(20000)
		});
		if (!res.ok) throw new Error(`summarize: ${res.status}`);
		return res.json();
	})();

	promise.catch(() => cache.delete(articleUrl));
	cache.set(articleUrl, promise);
	return promise;
}
