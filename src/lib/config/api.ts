/**
 * API Configuration
 */

import { browser } from '$app/environment';

const isDev = browser ? (import.meta.env?.DEV ?? false) : false;

// RSS feeds and market data both use the same Cloudflare Worker → corsproxy.io → allorigins chain.
// This was the working config before any proxy changes.
export const RSS_PROXIES: string[] = [
	'https://situation-monitor-proxy.seanthielen-e.workers.dev/?url=',
	'https://corsproxy.io/?url=',
	'https://api.allorigins.win/raw?url='
];

export const MARKET_PROXIES: string[] = [
	'https://situation-monitor-proxy.seanthielen-e.workers.dev/?url=',
	'https://corsproxy.io/?url=',
	'https://api.allorigins.win/raw?url='
];

// Keep for any legacy imports
export const CORS_PROXIES = RSS_PROXIES;
export const CORS_PROXY_URL = 'https://corsproxy.io/?url=';
export const CORS_PROXIES_COMPAT = { primary: CORS_PROXY_URL, fallback: 'https://api.allorigins.win/raw?url=' };

export const TRENDS_WORKER_URL = 'https://news-trends.mailboxanj.workers.dev/trends';

const PROXY_TIMEOUT_MS = 8000;

async function tryProxies(url: string, proxies: string[]): Promise<Response> {
	const encodedUrl = encodeURIComponent(url);
	let lastError: unknown;

	for (const proxy of proxies) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
		try {
			const response = await fetch(proxy + encodedUrl, { signal: controller.signal });
			clearTimeout(timer);
			if (response.ok) return response;
			logger.warn('API', `Proxy ${proxy.split('/')[2]} returned ${response.status}, trying next`);
			lastError = new Error(`HTTP ${response.status}`);
		} catch (err) {
			clearTimeout(timer);
			const isTimeout = (err as Error)?.name === 'AbortError';
			logger.warn('API', `Proxy ${proxy.split('/')[2]} ${isTimeout ? 'timed out' : 'failed'}, trying next`);
			lastError = err;
		}
	}

	throw new Error(`All proxies failed: ${(lastError as Error)?.message ?? 'unknown error'}`);
}

export function fetchWithProxy(url: string): Promise<Response> {
	return tryProxies(url, RSS_PROXIES);
}

export function fetchWithMarketProxy(url: string): Promise<Response> {
	return tryProxies(url, MARKET_PROXIES);
}

export const API_DELAYS = {
	betweenCategories: 500,
	betweenRetries: 1000
} as const;

export const CACHE_TTLS = {
	news: 5 * 60 * 1000,
	markets: 60 * 1000,
	default: 5 * 60 * 1000
} as const;

export const DEBUG = {
	enabled: isDev,
	logApiCalls: isDev,
	logCacheHits: false
} as const;

export const logger = {
	log: (prefix: string, ...args: unknown[]) => {
		if (DEBUG.logApiCalls) console.log(`[${prefix}]`, ...args);
	},
	warn: (prefix: string, ...args: unknown[]) => {
		console.warn(`[${prefix}]`, ...args);
	},
	error: (prefix: string, ...args: unknown[]) => {
		console.error(`[${prefix}]`, ...args);
	}
};
