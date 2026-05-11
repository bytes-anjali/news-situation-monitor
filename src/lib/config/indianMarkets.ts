export interface MarketSymbol {
	symbol: string;
	name: string;
	type: 'index' | 'sector';
}

export const INDICES: MarketSymbol[] = [
	{ symbol: '^NSEI', name: 'Nifty 50', type: 'index' },
	{ symbol: '^BSESN', name: 'Sensex', type: 'index' },
	{ symbol: '^NSEBANK', name: 'Nifty Bank', type: 'index' },
	{ symbol: 'INR=X', name: 'USD/INR', type: 'index' }
];

export const SECTORS: MarketSymbol[] = [
	{ symbol: '^CNXIT', name: 'Nifty IT', type: 'sector' },
	{ symbol: '^CNXFMCG', name: 'FMCG', type: 'sector' },
	{ symbol: '^CNXAUTO', name: 'Auto', type: 'sector' },
	{ symbol: '^CNXPHARMA', name: 'Pharma', type: 'sector' },
	{ symbol: '^CNXREALTY', name: 'Realty', type: 'sector' },
	{ symbol: '^CNXMETAL', name: 'Metal', type: 'sector' }
];

export const ALL_MARKET_SYMBOLS = [...INDICES, ...SECTORS];
