import { fetchWithProxy, logger } from '$lib/config/api';

export interface TrendItem {
	title: string;
	entityName: string;
	shareUrl: string;
}

interface TrendsStory {
	title?: string;
	entityNames?: string[];
	shareUrl?: string;
}

interface TrendsResponse {
	storySummaries?: {
		trendingStories?: TrendsStory[];
	};
}

export async function fetchBusinessTrends(): Promise<TrendItem[]> {
	// Google Trends realtime API — Business & Finance category, India
	const url =
		'https://trends.google.com/trends/api/realtimetrends?hl=en-IN&tz=-330&cat=b&fi=0&fs=0&geo=IN&ri=300&rs=20&sort=0';

	const response = await fetchWithProxy(url);
	const raw = await response.text();

	// Strip Google's anti-JSON-hijacking prefix ")]}'\n"
	const json = raw.replace(/^\)\]\}'\n?/, '');
	let data: TrendsResponse;
	try {
		data = JSON.parse(json);
	} catch {
		logger.warn('Trends', 'Failed to parse Google Trends response');
		return [];
	}

	const stories = data?.storySummaries?.trendingStories ?? [];

	return stories.slice(0, 5).map((s) => {
		const title = s.title ?? s.entityNames?.[0] ?? '';
		return {
			title,
			entityName: s.entityNames?.[0] ?? title,
			shareUrl:
				s.shareUrl ??
				`https://trends.google.com/trends/explore?cat=b&geo=IN&q=${encodeURIComponent(title)}`
		};
	});
}
