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
			`/api/summarize?url=${encodeURIComponent(articleUrl)}`,
			{ signal: AbortSignal.timeout(20000) }
		);
		if (!res.ok) throw new Error(`summarize: ${res.status}`);
		return res.json();
	})();

	promise.catch(() => cache.delete(articleUrl));
	cache.set(articleUrl, promise);
	return promise;
}
