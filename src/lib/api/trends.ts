import { TRENDS_WORKER_URL, logger } from '$lib/config/api';

export interface TrendItem {
	title: string;
	shareUrl: string;
}

interface WorkerTrend {
	title: string;
	shareUrl: string;
}

export async function fetchBusinessTrends(): Promise<TrendItem[]> {
	// Calls our Cloudflare Worker which fetches Google Trends B&F server-side.
	// Cloudflare IPs are not blocked by Google unlike shared CORS proxy IPs.
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 10000);

	try {
		const response = await fetch(TRENDS_WORKER_URL, { signal: controller.signal });
		clearTimeout(timer);

		if (!response.ok) {
			throw new Error(`Worker returned ${response.status}`);
		}

		const data: WorkerTrend[] | { error: string } = await response.json();

		if ('error' in data) {
			throw new Error(data.error);
		}

		return data.filter((t) => t.title).slice(0, 5);
	} catch (err) {
		clearTimeout(timer);
		logger.warn('Trends', (err as Error).message);
		throw err;
	}
}
