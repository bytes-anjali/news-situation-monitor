import type { NewsCard } from '$lib/types';
import { fetchWithProxy } from '$lib/config/api';
import { scoreRelevance } from '$lib/config/newsCategories';

// ── Data feed source definitions ────────────────────────────────────────────

export interface DataFeed {
	id: string;
	name: string;
	url: string;
	color: string;
	category: 'regulatory' | 'corp-action' | 'market-data';
	minScore: number; // 0 = always include, >0 = relevance filter
}

export const DATA_FEEDS: DataFeed[] = [
	{
		id: 'sebi',
		name: 'SEBI',
		url: 'https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRssNews=yes',
		color: '#e91e63',
		category: 'regulatory',
		minScore: 0
	},
	{
		id: 'rbi',
		name: 'RBI',
		url: 'https://rbi.org.in/Scripts/RSSParser.aspx?Id=104',
		color: '#00897b',
		category: 'regulatory',
		minScore: 0
	},
	{
		id: 'pib-finance',
		name: 'PIB Finance',
		url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3',
		color: '#7c4dff',
		category: 'regulatory',
		minScore: 0
	},
	{
		id: 'corp-actions',
		name: 'Corp Actions',
		url: 'https://news.google.com/rss/search?q=india+(dividend+OR+"board+meeting"+OR+"stock+split"+OR+buyback+OR+"rights+issue"+OR+"bonus+share")+site:economictimes.indiatimes.com+OR+site:business-standard.com&hl=en-IN&gl=IN&ceid=IN:en',
		color: '#ff9800',
		category: 'corp-action',
		minScore: 0
	},
	{
		id: 'bulk-deals-news',
		name: 'Bulk & Block Deals',
		url: 'https://news.google.com/rss/search?q=india+("bulk+deal"+OR+"block+deal"+OR+"insider+trading"+OR+"promoter+stake")&hl=en-IN&gl=IN&ceid=IN:en',
		color: '#ffd600',
		category: 'market-data',
		minScore: 0
	},
	{
		id: 'sip-amfi',
		name: 'MF Data',
		url: 'https://news.google.com/rss/search?q=india+("SIP+data"+OR+"AMFI+data"+OR+"mutual+fund+AUM"+OR+"SIP+inflows"+OR+"folio+count")&hl=en-IN&gl=IN&ceid=IN:en',
		color: '#3fb950',
		category: 'market-data',
		minScore: 0
	}
];

// ── Extra regulatory scoring terms ──────────────────────────────────────────

const REGULATORY_SCORE_RULES: Array<{ terms: string[]; pts: number }> = [
	{ terms: ['circular', 'notification', 'gazette', 'amendment', 'regulation'], pts: 10 },
	{ terms: ['sebi', 'rbi', 'irda', 'irdai', 'pfrda', 'nabard'], pts: 15 },
	{ terms: ['repo rate', 'monetary policy', 'mpc', 'crr', 'slr', 'liquidity'], pts: 15 },
	{ terms: ['sip', 'aum', 'folio', 'mutual fund', 'amfi'], pts: 10 },
	{ terms: ['bulk deal', 'block deal', 'insider', 'shareholding', 'promoter'], pts: 12 },
	{ terms: ['results', 'dividend', 'board meeting', 'agm', 'rights issue'], pts: 10 },
	{ terms: ['fdi', 'fpi', 'nri', 'external commercial', 'forex reserve'], pts: 8 },
	{ terms: ['gdp', 'inflation', 'cpi', 'iip', 'trade deficit', 'current account'], pts: 8 },
	{ terms: ['tax', 'gst', 'income tax', 'budget', 'fiscal', 'revenue'], pts: 7 }
];

function scoreDataItem(headline: string): number {
	const h = headline.toLowerCase();
	let score = scoreRelevance(headline);
	for (const rule of REGULATORY_SCORE_RULES) {
		if (rule.terms.some((t) => h.includes(t))) score += rule.pts;
	}
	return score;
}

// ── RSS parsing (reuse DOMParser like news.ts) ───────────────────────────────

interface RawItem {
	title: string;
	link: string;
	pubDate: string;
	feedId: string;
	feedName: string;
	feedColor: string;
}

function cleanTitle(raw: string): string {
	return raw.replace(/\s+-\s+[^-]+$/, '').trim();
}

function parseRSS(xmlText: string, feed: DataFeed): RawItem[] {
	if (typeof DOMParser === 'undefined') return [];
	let doc: Document;
	try {
		doc = new DOMParser().parseFromString(xmlText, 'text/xml');
	} catch { return []; }
	if (doc.querySelector('parsererror')) return [];

	return Array.from(doc.querySelectorAll('item, entry')).map((item) => {
		const rawTitle = item.querySelector('title')?.textContent?.trim().replace(/^<!\[CDATA\[|\]\]>$/g, '') ?? '';
		const title = cleanTitle(rawTitle);
		const linkEl = item.querySelector('link');
		const link = linkEl?.getAttribute('href') || linkEl?.textContent?.trim() || item.querySelector('guid')?.textContent?.trim() || '';
		const pubDate =
			item.querySelector('pubDate')?.textContent?.trim() ||
			item.querySelector('published')?.textContent?.trim() ||
			item.querySelector('updated')?.textContent?.trim() || '';
		return { title, link, pubDate, feedId: feed.id, feedName: feed.name, feedColor: feed.color };
	}).filter((i) => i.title.length > 0 && i.link.length > 0);
}

// ── Main fetch function ──────────────────────────────────────────────────────

function processItems(items: RawItem[], feed: DataFeed, now: number): NewsCard[] {
	const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — regulatory feeds update infrequently
	const cards: NewsCard[] = [];
	for (const item of items) {
		let ts: Date;
		if (item.pubDate) {
			const parsed = new Date(item.pubDate);
			if (isNaN(parsed.getTime())) { ts = new Date(now); }
			else if (now - parsed.getTime() > MAX_AGE_MS) continue;
			else { ts = parsed; }
		} else {
			ts = new Date(now);
		}
		const score = scoreDataItem(item.title);
		if (feed.minScore > 0 && score < feed.minScore) continue;
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
}

export async function fetchDataFeeds(): Promise<NewsCard[]> {
	const now = Date.now();

	const results = await Promise.allSettled(
		DATA_FEEDS.map(async (feed) => {
			const response = await fetchWithProxy(feed.url);
			const text = await response.text();
			return processItems(parseRSS(text, feed), feed, now);
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
