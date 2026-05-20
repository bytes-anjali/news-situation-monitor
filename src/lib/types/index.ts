export interface MarketQuote {
	symbol: string;
	name: string;
	price: number;
	change: number;
	changePercent: number;
	type: 'index' | 'sector';
}

export interface StockQuote {
	symbol: string;
	name: string;
	price: number;
	change: number;
	changePercent: number;
}

export interface GainersLosers {
	gainers: StockQuote[];
	losers: StockQuote[];
}

export interface NewsSource {
	feedId: string;
	name: string;
	url: string;
	color: string;
}

export type NewsCategory = 'stocks' | 'mutual-funds' | 'personal-finance' | 'other' | 'regulatory' | 'corp-action' | 'market-data';

export interface NewsCard {
	id: string;
	headline: string;
	sources: NewsSource[];
	timestamp: Date;
	category: NewsCategory;
	angle: string;
	isDataCard?: boolean;
}

export interface MarketsData {
	indices: MarketQuote[];
	sectors: MarketQuote[];
}
