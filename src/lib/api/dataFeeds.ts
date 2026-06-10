import type { NewsCard } from '$lib/types';
import { fetchWithProxy } from '$lib/config/api';

export interface DataFeed {
	id: string;
	name: string;
	url: string;
	color: string;
	category: 'regulatory' | 'corp-action' | 'market-data';
}

export const DATA_FEEDS: DataFeed[] = [
	{
		id: 'sebi',
		name: 'SEBI',
		url: 'https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRssNews=yes',
		color: '#e91e63',
		category: 'regulatory'
	},
	{
		id: 'rbi',
		name: 'RBI',
		url: 'https://rbi.org.in/Scripts/RSSParser.aspx?Id=104',
		color: '#00897b',
		category: 'regulatory'
	},
	{
		id: 'pib-finance',
		name: 'PIB Finance',
		url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3',
		color: '#7c4dff',
		category: 'regulatory'
	}
];

// Strip boilerplate appended by regulatory sites to titles
function cleanTitle(raw: string): string {
	return raw
		.replace(/^<!\[CDATA\[|\]\]>$/g, '')
		.replace(/\s*[-|]\s*(SEBI|RBI|PIB|Press Information Bureau|Securities and Exchange Board of India|Reserve Bank of India)[^-|]*$/i, '')
		.replace(/\s*-\s*[A-Z]{2,}\/[A-Z0-9\/.-]{10,}\s*$/i, '') // strip circular ref codes at end
		.trim();
}

function parseRSS(xmlText: string): Array<{ title: string; link: string; pubDate: string }> {
	// Server-side (Express) returns plain XML; browser also receives it via rss-proxy
	const items: Array<{ title: string; link: string; pubDate: string }> = [];
	const itemRx = /<item[^>]*>([\s\S]*?)<\/item>/gi;
	let m: RegExpExecArray | null;
	while ((m = itemRx.exec(xmlText)) !== null) {
		const body = m[1];
		const rawTitle = (/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i.exec(body) ?? [])[1]?.trim() ?? '';
		const title = cleanTitle(rawTitle);
		const link =
			(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i.exec(body) ?? [])[1]?.trim() ||
			(/<guid[^>]*>([\s\S]*?)<\/guid>/i.exec(body) ?? [])[1]?.trim() || '';
		const pubDate = (/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i.exec(body) ?? [])[1]?.trim() ?? '';
		if (title && link) items.push({ title, link, pubDate });
	}
	return items;
}

async function fetchFeedXml(url: string, apiBase: string): Promise<string> {
	if (apiBase) {
		try {
			const r = await fetch(`${apiBase}/rss-proxy?url=${encodeURIComponent(url)}`, {
				signal: AbortSignal.timeout(12000)
			});
			if (r.ok) return r.text();
		} catch { /* fall through */ }
	}
	const r = await fetchWithProxy(url);
	return r.text();
}

export async function fetchDataFeeds(): Promise<NewsCard[]> {
	const apiBase = (import.meta.env?.VITE_API_URL ?? '').replace(/\/$/, '');
	const now = Date.now();
	const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — regulatory feeds update infrequently

	const results = await Promise.allSettled(
		DATA_FEEDS.map(async (feed) => {
			const xml = await fetchFeedXml(feed.url, apiBase);
			const raw = parseRSS(xml);
			const cards: NewsCard[] = [];
			for (const item of raw) {
				let ts: Date;
				if (item.pubDate) {
					const parsed = new Date(item.pubDate);
					if (isNaN(parsed.getTime())) { ts = new Date(now); }
					else if (now - parsed.getTime() > MAX_AGE_MS) continue;
					else { ts = parsed; }
				} else {
					ts = new Date(now);
				}
				cards.push({
					id: `data-${feed.id}-${item.link.slice(-20)}-${ts.getTime()}`,
					headline: item.title,
					sources: [{ feedId: feed.id, name: feed.name, url: item.link, color: feed.color }],
					timestamp: ts,
					category: feed.category,
					angle: '',
					isDataCard: true
				});
			}
			return cards;
		})
	);

	const cards: NewsCard[] = [];
	for (const result of results) {
		if (result.status === 'fulfilled') cards.push(...result.value);
	}

	const seen = new Set<string>();
	return cards
		.filter((c) => {
			const key = c.headline.toLowerCase().replace(/\s+/g, ' ').slice(0, 60);
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		})
		.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
		.slice(0, 40);
}
