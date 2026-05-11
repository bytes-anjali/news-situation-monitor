import { fetchWithProxy } from '$lib/config/api';
import { INDIAN_NEWS_FEEDS } from '$lib/config/feeds';
import { scoreHeadline } from '$lib/config/keywords';
import type { NewsCard, NewsSource } from '$lib/types';

interface RawItem {
	title: string;
	link: string;
	pubDate: string;
	feedId: string;
	feedName: string;
	feedColor: string;
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
			const title =
				item.querySelector('title')?.textContent?.trim().replace(/^<!\[CDATA\[|\]\]>$/g, '') ?? '';

			// RSS 2.0: <link>URL</link> or Atom: <link href="URL"/>
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

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
	if (a.size === 0 && b.size === 0) return 1;
	let intersectionCount = 0;
	for (const word of a) {
		if (b.has(word)) intersectionCount++;
	}
	const unionSize = a.size + b.size - intersectionCount;
	return unionSize === 0 ? 0 : intersectionCount / unionSize;
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
			if (jaccardSimilarity(group.tokens, tokens) >= 0.5) {
				// Same story — add source if not already present
				if (!group.sources.has(item.feedId)) {
					group.sources.set(item.feedId, {
						feedId: item.feedId,
						name: item.feedName,
						url: item.link,
						color: item.feedColor
					});
				}
				// Keep most recent timestamp
				if (ts > group.timestamp) {
					group.timestamp = ts;
				}
				matched = true;
				break;
			}
		}

		if (!matched) {
			groups.push({
				headline: item.title,
				tokens,
				sources: new Map([
					[
						item.feedId,
						{
							feedId: item.feedId,
							name: item.feedName,
							url: item.link,
							color: item.feedColor
						}
					]
				]),
				timestamp: ts
			});
		}
	}

	return groups
		.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
		.map((g, i) => {
			const scored = scoreHeadline(g.headline);
			return {
				id: `card-${i}-${g.timestamp.getTime()}`,
				headline: g.headline,
				sources: Array.from(g.sources.values()),
				timestamp: g.timestamp,
				keyTerm: scored.term,
				searchVolume: scored.volume,
				isSpot: scored.isSpot
			};
		});
}

export async function fetchIndianNews(): Promise<NewsCard[]> {
	const allItems: RawItem[] = [];

	// Fetch feeds sequentially with a short delay to avoid hammering proxies
	for (const feed of INDIAN_NEWS_FEEDS) {
		try {
			const response = await fetchWithProxy(feed.url);
			const text = await response.text();
			const items = parseRSS(text, feed.id, feed.name, feed.color);
			allItems.push(...items);
		} catch (err) {
			console.warn(`[News] Failed to fetch ${feed.name}:`, err);
		}
		// Small delay between feed requests
		await new Promise((r) => setTimeout(r, 300));
	}

	return deduplicateAndGroup(allItems);
}
