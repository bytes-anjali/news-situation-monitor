import { fetchWithProxy } from '$lib/config/api';
import { INDIAN_NEWS_FEEDS } from '$lib/config/feeds';
import { isFinanceRelevant, classifyCategory, generateAngle } from '$lib/config/newsCategories';
import type { NewsCard, NewsSource } from '$lib/types';

interface RawItem {
	title: string;
	link: string;
	pubDate: string;
	feedId: string;
	feedName: string;
	feedColor: string;
}

function cleanTitle(raw: string): string {
	// Google News appends " - Publication Name" — strip it
	return raw.replace(/\s+-\s+[^-]+$/, '').trim();
}

function parseRSS(xmlText: string, feedId: string, feedName: string, feedColor: string): RawItem[] {
	if (typeof DOMParser === 'undefined') return [];

	let doc: Document;
	try {
		const parser = new DOMParser();
		doc = parser.parseFromString(xmlText, 'text/xml');
	} catch {
		return [];
	}

	const parseError = doc.querySelector('parsererror');
	if (parseError) return [];

	const items = doc.querySelectorAll('item, entry');

	return Array.from(items)
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

			return { title, link, pubDate, feedId, feedName, feedColor };
		})
		.filter((item) => item.title.length > 0 && item.link.length > 0);
}

function tokenize(text: string): Set<string> {
	const STOP = new Set([
		'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but',
		'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'has', 'have',
		'had', 'will', 'its', 'this', 'that', 'says', 'said', 'over', 'up', 'down'
	]);
	return new Set(
		text
			.toLowerCase()
			.replace(/[^\w\s]/g, ' ')
			.split(/\s+/)
			.filter((w) => w.length > 2 && !STOP.has(w))
	);
}

function similarity(a: Set<string>, b: Set<string>): { jaccard: number; shared: number } {
	if (a.size === 0 && b.size === 0) return { jaccard: 1, shared: 0 };
	let shared = 0;
	for (const word of a) {
		if (b.has(word)) shared++;
	}
	const unionSize = a.size + b.size - shared;
	return { jaccard: unionSize === 0 ? 0 : shared / unionSize, shared };
}

function deduplicateAndGroup(items: RawItem[]): NewsCard[] {
	type Group = {
		headline: string;
		tokens: Set<string>;
		sources: Map<string, NewsSource>;
		timestamp: Date;
	};

	const groups: Group[] = [];

	for (const item of items) {
		const tokens = tokenize(item.title);
		const ts = item.pubDate ? new Date(item.pubDate) : new Date(0);

		let matched = false;
		for (const group of groups) {
			const { jaccard, shared } = similarity(group.tokens, tokens);
			if (jaccard >= 0.2 && shared >= 2) {
				if (!group.sources.has(item.feedId)) {
					group.sources.set(item.feedId, {
						feedId: item.feedId,
						name: item.feedName,
						url: item.link,
						color: item.feedColor
					});
				}
				if (ts > group.timestamp) group.timestamp = ts;
				// Union tokens so later articles can also match this group
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

	return groups
		.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
		.map((g, i) => {
			const category = classifyCategory(g.headline);
			return {
				id: `card-${i}-${g.timestamp.getTime()}`,
				headline: g.headline,
				sources: Array.from(g.sources.values()),
				timestamp: g.timestamp,
				category,
				angle: generateAngle(g.headline, category)
			};
		});
}

export async function fetchIndianNews(): Promise<NewsCard[]> {
	const allItems: RawItem[] = [];

	for (const feed of INDIAN_NEWS_FEEDS) {
		try {
			const response = await fetchWithProxy(feed.url);
			const text = await response.text();
			const items = parseRSS(text, feed.id, feed.name, feed.color);
			allItems.push(...items);
		} catch (err) {
			console.warn(`[News] Failed to fetch ${feed.name}:`, err);
		}
		await new Promise((r) => setTimeout(r, 300));
	}

	const financeItems = allItems.filter((item) => isFinanceRelevant(item.title));
	return deduplicateAndGroup(financeItems);
}
