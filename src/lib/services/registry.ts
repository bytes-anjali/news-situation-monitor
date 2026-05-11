export interface CacheConfig {
	ttl: number;
	staleWhileRevalidate: boolean;
}

export interface CircuitBreakerConfig {
	failureThreshold: number;
	resetTimeout: number;
}

export interface ServiceConfig {
	id: string;
	baseUrl: string | null;
	timeout: number;
	retries: number;
	cache?: CacheConfig;
	circuitBreaker?: CircuitBreakerConfig;
	proxies?: string[];
}

export type ServiceId = 'YAHOO_FINANCE' | 'RSS' | 'CORS_PROXY';

const SERVICE_CONFIG: Record<ServiceId, ServiceConfig> = {
	YAHOO_FINANCE: {
		id: 'yahoo_finance',
		baseUrl: null,
		timeout: 12000,
		retries: 2,
		cache: {
			ttl: 60 * 1000, // 1 minute
			staleWhileRevalidate: true
		},
		circuitBreaker: {
			failureThreshold: 3,
			resetTimeout: 120000
		}
	},

	RSS: {
		id: 'rss',
		baseUrl: null,
		timeout: 15000,
		retries: 1,
		cache: {
			ttl: 5 * 60 * 1000, // 5 minutes
			staleWhileRevalidate: true
		},
		circuitBreaker: {
			failureThreshold: 3,
			resetTimeout: 60000
		}
	},

	CORS_PROXY: {
		id: 'cors_proxy',
		baseUrl: null,
		proxies: [
			'https://situation-monitor-proxy.seanthielen-e.workers.dev/?url=',
			'https://api.allorigins.win/raw?url='
		],
		timeout: 12000,
		retries: 1,
		cache: {
			ttl: 5 * 60 * 1000,
			staleWhileRevalidate: true
		},
		circuitBreaker: {
			failureThreshold: 5,
			resetTimeout: 120000
		}
	}
};

export class ServiceRegistry {
	static get(serviceId: ServiceId | string): ServiceConfig | null {
		return SERVICE_CONFIG[serviceId as ServiceId] || null;
	}

	static getServiceIds(): ServiceId[] {
		return Object.keys(SERVICE_CONFIG) as ServiceId[];
	}

	static getAll(): Record<ServiceId, ServiceConfig> {
		return { ...SERVICE_CONFIG };
	}

	static has(serviceId: string): serviceId is ServiceId {
		return Object.hasOwn(SERVICE_CONFIG, serviceId);
	}

	static getCorsProxies(): string[] {
		return SERVICE_CONFIG.CORS_PROXY.proxies || [];
	}
}

export { SERVICE_CONFIG };
