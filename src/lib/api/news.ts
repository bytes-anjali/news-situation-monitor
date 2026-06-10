import { fetchWithProxy } from '$lib/config/api';
import { INDIAN_NEWS_FEEDS } from '$lib/config/feeds';
import { scoreRelevance, generateAngle, MIN_SCORE } from '$lib/config/newsCategories';
import type { NewsCard, NewsSource } from '$lib/types';

export type NewsCategory = 'stocks' | 'mutual-funds' | 'personal-finance' | 'economics';

const STOCKS_MAX_CARDS = 25;
const MAX_AGE_MS = 36 * 60 * 60 * 1000; // 36 hours

interface RawItem {
	title: string;
	link: string;
	pubDate: string;
	feedId: string;
	feedName: string;
	feedColor: string;
	forceCategory?: string | null;
}

function cleanTitle(raw: string): string {
	return raw.replace(/\s+-\s+[^-]+$/, '').trim();
}

function parseRSS(xmlText: string, feedId: string, feedName: string, feedColor: string, forceCategory?: string): RawItem[] {
	if (typeof DOMParser === 'undefined') return [];
	let doc: Document;
	try {
		const parser = new DOMParser();
		doc = parser.parseFromString(xmlText, 'text/xml');
	} catch { return []; }
	if (doc.querySelector('parsererror')) return [];

	return Array.from(doc.querySelectorAll('item, entry'))
		.map((item) => {
			const rawTitle =
				item.querySelector('title')?.textContent?.trim().replace(/^<!\[CDATA\[|\]\]>$/g, '') ?? '';
			const title = cleanTitle(rawTitle);
			const linkEl = item.querySelector('link');
			const link =
				linkEl?.getAttribute('href') ||
				linkEl?.textContent?.trim() ||
				item.querySelector('guid')?.textContent?.trim() ||
				'';
			const pubDate =
				item.querySelector('pubDate')?.textContent?.trim() ||
				item.querySelector('published')?.textContent?.trim() ||
				item.querySelector('updated')?.textContent?.trim() ||
				'';
			return { title, link, pubDate, feedId, feedName, feedColor, forceCategory };
		})
		.filter((item) => item.title.length > 0 && item.link.length > 0);
}

function tokenize(text: string): Set<string> {
	const STOP = new Set([
		'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but',
		'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'has', 'have',
		'had', 'will', 'its', 'this', 'that', 'says', 'said', 'over', 'up', 'down',
		'after', 'amid', 'despite', 'following', 'per', 'cent', 'new', 'latest',
		'india', 'indian', 'global', 'domestic', 'shares', 'share', 'stock', 'stocks',
		'market', 'markets', 'trading', 'rise', 'rises', 'fall', 'falls', 'fell',
		'gain', 'gains', 'loss', 'losses', 'rally', 'crash', 'surge', 'surges',
		'jump', 'jumps', 'plunge', 'drop', 'drops', 'slip', 'high', 'low',
		'points', 'percent', 'crore', 'lakh', 'billion', 'million',
		'company', 'firm', 'group', 'ltd', 'limited', 'data', 'report', 'today'
	]);
	return new Set(
		text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/)
			.filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w))
	);
}

function similarity(a: Set<string>, b: Set<string>): { jaccard: number; shared: number } {
	if (a.size === 0 && b.size === 0) return { jaccard: 1, shared: 0 };
	let shared = 0;
	for (const word of a) { if (b.has(word)) shared++; }
	const unionSize = a.size + b.size - shared;
	return { jaccard: unionSize === 0 ? 0 : shared / unionSize, shared };
}

const ENTITIES = new Set([
	'nifty', 'sensex', 'rbi', 'sebi', 'ipo', 'fii', 'dii', 'mpc',
	'reliance', 'tcs', 'hdfc', 'icici', 'sbi', 'infosys', 'adani',
	'bajaj', 'wipro', 'hcl', 'maruti', 'ongc', 'ntpc', 'itc', 'kotak',
	'zomato', 'swiggy', 'paytm', 'nykaa', 'titan', 'axis', 'bpcl', 'bhel'
]);

function sharedEntities(a: Set<string>, b: Set<string>): number {
	let count = 0;
	for (const w of a) { if (ENTITIES.has(w) && b.has(w)) count++; }
	return count;
}

function deduplicateAndGroup(items: RawItem[], category: NewsCategory): NewsCard[] {
	type Group = {
		headline: string;
		tokens: Set<string>;
		sources: Map<string, NewsSource>;
		timestamp: Date;
	};

	const groups: Group[] = [];
	const now = Date.now();

	for (const item of items) {
		const tokens = tokenize(item.title);
		let ts: Date;
		if (item.pubDate) {
			const parsed = new Date(item.pubDate);
			if (isNaN(parsed.getTime())) { ts = new Date(now); }
			else if (now - parsed.getTime() > MAX_AGE_MS) continue;
			else { ts = parsed; }
		} else {
			ts = new Date(now);
		}

		let matched = false;
		for (const group of groups) {
			const { jaccard, shared } = similarity(group.tokens, tokens);
			const entityShared = sharedEntities(group.tokens, tokens);
			if ((jaccard >= 0.25 && shared >= 2) || (entityShared >= 2 && shared >= 3)) {
				if (!group.sources.has(item.feedId)) {
					group.sources.set(item.feedId, {
						feedId: item.feedId, name: item.feedName, url: item.link, color: item.feedColor
					});
				}
				if (ts > group.timestamp) group.timestamp = ts;
				for (const t of tokens) group.tokens.add(t);
				matched = true;
				break;
			}
		}

		if (!matched) {
			groups.push({
				headline: item.title,
				tokens,
				sources: new Map([
					[item.feedId, { feedId: item.feedId, name: item.feedName, url: item.link, color: item.feedColor }]
				]),
				timestamp: ts
			});
		}
	}

	const scored = groups.map((g) => {
		const sources = Array.from(g.sources.values());
		const sourceBonus = Math.min(sources.length - 1, 4) * 2;
		return { g, sources, score: scoreRelevance(g.headline) + sourceBonus };
	});

	// For stocks: score filter + cap. For others: show everything in 36hr window, sorted by recency.
	const qualifying =
		category === 'stocks'
			? scored.filter((x) => x.score >= MIN_SCORE)
				.sort((a, b) => b.score - a.score || b.g.timestamp.getTime() - a.g.timestamp.getTime())
				.slice(0, STOCKS_MAX_CARDS)
			: scored.sort((a, b) => b.g.timestamp.getTime() - a.g.timestamp.getTime());

	return qualifying.map((x, i) => ({
		id: `card-${category}-${i}-${x.g.timestamp.getTime()}`,
		headline: x.g.headline,
		sources: x.sources,
		timestamp: x.g.timestamp,
		category: category as import('$lib/types').NewsCategory,
		angle: generateAngle(x.g.headline, category as import('$lib/types').NewsCategory)
	}));
}

export async function fetchCategoryNews(category: NewsCategory): Promise<NewsCard[]> {
	const API_BASE = (import.meta.env?.VITE_API_URL ?? '').replace(/\/$/, '');

	if (API_BASE) {
		try {
			const res = await fetch(`${API_BASE}/news?category=${category}`, {
				signal: AbortSignal.timeout(20000)
			});
			if (res.ok) {
				const { items } = await res.json();
				// Trust the server response even if empty — avoids falling through
				// to CORS proxies which break when rate-limited
				return deduplicateAndGroup((Array.isArray(items) ? items : []) as RawItem[], category);
			}
		} catch { /* fall through to client-side proxies only if server unreachable */ }
	}

	// Fallback: browser-side CORS proxy
	const categoryFeeds = INDIAN_NEWS_FEEDS.filter((f) =>
		category === 'stocks' ? !f.forceCategory : f.forceCategory === category
	);
	if (categoryFeeds.length === 0) return [];

	const results = await Promise.allSettled(
		categoryFeeds.map(async (feed) => {
			const response = await fetchWithProxy(feed.url);
			const text = await response.text();
			return parseRSS(text, feed.id, feed.name, feed.color, feed.forceCategory);
		})
	);

	const allItems: RawItem[] = [];
	let failCount = 0;
	for (const result of results) {
		if (result.status === 'fulfilled') allItems.push(...result.value);
		else failCount++;
	}
	if (failCount === categoryFeeds.length) {
		throw new Error(`All ${category} feeds failed — check your connection or try again shortly`);
	}

	return deduplicateAndGroup(allItems, category);
}

// Legacy export kept so any remaining code importing fetchIndianNews still compiles
export const fetchIndianNews = () => fetchCategoryNews('stocks');
