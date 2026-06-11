import type { NewsCategory } from '$lib/types';

export interface NewsFeed {
	id: string;
	name: string;
	url: string;
	color: string;
	forceCategory?: NewsCategory;
}

export const INDIAN_NEWS_FEEDS: NewsFeed[] = [
	// ── Stocks (direct RSS — no Google News intermediary) ────────────────────────
	{ id: 'et-markets',   name: 'ET Markets',       url: 'https://economictimes.indiatimes.com/markets/rss.cms',             color: '#ff6b2b' },
	{ id: 'mc-latest',    name: 'MoneyControl',      url: 'https://www.moneycontrol.com/rss/latestnews.xml',                  color: '#1565c0' },
	{ id: 'bs-markets',   name: 'Business Standard', url: 'https://www.business-standard.com/rss/markets-106.rss',            color: '#0d47a1' },
	{ id: 'mint-markets', name: 'LiveMint',          url: 'https://www.livemint.com/rss/markets',                             color: '#2e7d32' },
	{ id: 'ndtv-profit',  name: 'NDTV Profit',       url: 'https://feeds.feedburner.com/ndtvprofit-latest-news',              color: '#b71c1c' },
	{ id: 'fe-markets',   name: 'Financial Express', url: 'https://www.financialexpress.com/market/feed/',                    color: '#e65100' },
	// ── Mutual Funds ─────────────────────────────────────────────────────────────
	{
		id: 'cafemutual',
		name: 'Cafe Mutual',
		url: 'https://news.google.com/rss/search?q=site:cafemutual.com&hl=en-IN&gl=IN&ceid=IN:en',
		color: '#00bcd4',
		forceCategory: 'mutual-funds'
	},
	// ── Personal Finance ─────────────────────────────────────────────────────────
	{
		id: 'mint-money',
		name: 'Mint Money',
		url: 'https://news.google.com/rss/search?q=site:livemint.com/money&hl=en-IN&gl=IN&ceid=IN:en',
		color: '#4caf50',
		forceCategory: 'personal-finance'
	},
	{
		id: 'et-wealth',
		name: 'ET Wealth',
		url: 'https://news.google.com/rss/search?q=site:economictimes.indiatimes.com/wealth&hl=en-IN&gl=IN&ceid=IN:en',
		color: '#ff9800',
		forceCategory: 'personal-finance'
	},
	{
		id: 'bs-pf',
		name: 'BS Personal Finance',
		url: 'https://news.google.com/rss/search?q=site:business-standard.com/personal-finance&hl=en-IN&gl=IN&ceid=IN:en',
		color: '#607d8b',
		forceCategory: 'personal-finance'
	},
	// ── Economics ────────────────────────────────────────────────────────────────
	{
		id: 'econ-india',
		name: 'India Economy',
		url: 'https://news.google.com/rss/search?q=india+(gdp+OR+inflation+OR+"current+account"+OR+"fiscal+deficit"+OR+"trade+deficit"+OR+imf+OR+"world+bank"+OR+"economic+growth")&hl=en-IN&gl=IN&ceid=IN:en',
		color: '#ff6600',
		forceCategory: 'economics'
	},
	{
		id: 'econ-global',
		name: 'Global Economy',
		url: 'https://news.google.com/rss/search?q=(fed+OR+"federal+reserve"+OR+"us+economy"+OR+"global+recession"+OR+"oil+price"+OR+"dollar+index")+india&hl=en-IN&gl=IN&ceid=IN:en',
		color: '#9c27b0',
		forceCategory: 'economics'
	}
];
