import type { NewsCategory } from '$lib/types';

export interface NewsFeed {
	id: string;
	name: string;
	url: string;
	color: string;
	forceCategory?: NewsCategory;
}

export const INDIAN_NEWS_FEEDS: NewsFeed[] = [
	// ── Stocks ──────────────────────────────────────────────────────────────────
	{
		id: 'et-markets',
		name: 'ET Markets',
		url: 'https://economictimes.indiatimes.com/markets/rss.cms',
		color: '#ff6b2b'
	},
	{
		id: 'moneycontrol',
		name: 'MoneyControl',
		url: 'https://news.google.com/rss/search?q=site:moneycontrol.com+stock+OR+market+OR+nifty+OR+sensex&hl=en-IN&gl=IN&ceid=IN:en',
		color: '#9c27b0'
	},
	{
		id: 'ndtv-profit',
		name: 'NDTV Profit',
		url: 'https://news.google.com/rss/search?q=site:ndtvprofit.com+stock+OR+market+OR+sensex+OR+nifty&hl=en-IN&gl=IN&ceid=IN:en',
		color: '#e91e63'
	},
	{
		id: 'bs-markets',
		name: 'Business Standard',
		url: 'https://news.google.com/rss/search?q=site:business-standard.com+(market+OR+nifty+OR+sensex+OR+ipo+OR+results)&hl=en-IN&gl=IN&ceid=IN:en',
		color: '#4488ff'
	},
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
		id: 'reuters-economy',
		name: 'Reuters',
		url: 'https://news.google.com/rss/search?q=site:reuters.com+(india+OR+economy+OR+inflation+OR+fed+OR+rbi+OR+gdp+OR+recession)&hl=en-IN&gl=IN&ceid=IN:en',
		color: '#ff6600',
		forceCategory: 'economics'
	},
	{
		id: 'bloomberg-india',
		name: 'Bloomberg',
		url: 'https://news.google.com/rss/search?q=site:bloomberg.com+(india+OR+"emerging+markets"+OR+inflation+OR+fed+OR+rbi+OR+gdp)&hl=en-IN&gl=IN&ceid=IN:en',
		color: '#1a1a2e',
		forceCategory: 'economics'
	}
];
