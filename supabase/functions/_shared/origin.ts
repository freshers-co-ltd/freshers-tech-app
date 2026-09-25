export interface ResolveBaseUrlOptions {
	siteUrl?: string;
	corsOrigin?: string;
}

export function parseAllowedOrigins(allowed: string | undefined): string[] {
	if (!allowed) {
		return [];
	}
	return allowed
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

export function resolveAppBaseUrl(req: Request, options: ResolveBaseUrlOptions = {}): string {
	const fallback = options.siteUrl ?? '';
	try {
		const originHeader = req.headers.get('Origin');
		if (!originHeader) {
			return fallback;
		}
		const parsed = new URL(originHeader);
		if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
			return fallback;
		}
		if (parsed.protocol === 'http:') {
			const hostname = parsed.hostname;
			if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
				return fallback;
			}
		}
		const allowed = parseAllowedOrigins(options.corsOrigin);
		if (allowed.length > 0 && !allowed.includes(parsed.origin)) {
			return fallback;
		}
		return parsed.origin;
	} catch {
		return fallback;
	}
}
