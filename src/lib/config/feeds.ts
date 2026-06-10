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
