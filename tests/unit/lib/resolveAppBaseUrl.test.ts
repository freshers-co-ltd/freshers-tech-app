import { describe, expect, it } from 'vitest';
import {
	parseAllowedOrigins,
	resolveAppBaseUrl,
} from '../../../supabase/functions/_shared/origin.ts';

const SITE_URL = 'https://app.freshersco.com';

function requestWithOrigin(origin: string | null): Request {
	const headers = new Headers();
	if (origin !== null) {
		headers.set('Origin', origin);
	}
	return new Request('https://functions.supabase.co/stripe-billing/checkout', { headers });
}

describe('resolveAppBaseUrl', () => {
	it('accepts an https preview origin when no allowlist is configured', () => {
		const result = resolveAppBaseUrl(requestWithOrigin('https://freshers-abc123.vercel.app'), {
			siteUrl: SITE_URL,
		});
		expect(result).toBe('https://freshers-abc123.vercel.app');
	});

	it('accepts a listed origin when CORS_ORIGIN is configured', () => {
		const result = resolveAppBaseUrl(requestWithOrigin('https://app.freshersco.com'), {
			siteUrl: SITE_URL,
			corsOrigin: 'https://app.freshersco.com, https://freshersco.com',
		});
		expect(result).toBe('https://app.freshersco.com');
	});

	it('falls back to siteUrl for an unlisted origin when CORS_ORIGIN is configured', () => {
		const result = resolveAppBaseUrl(requestWithOrigin('https://other-app.vercel.app'), {
			siteUrl: SITE_URL,
			corsOrigin: 'https://app.freshersco.com',
		});
		expect(result).toBe(SITE_URL);
	});

	it('falls back to siteUrl for non-localhost http origins', () => {
		const result = resolveAppBaseUrl(requestWithOrigin('http://evil.com'), {
			siteUrl: SITE_URL,
		});
		expect(result).toBe(SITE_URL);
	});

	it('falls back to siteUrl when the Origin header is missing', () => {
		const result = resolveAppBaseUrl(requestWithOrigin(null), { siteUrl: SITE_URL });
		expect(result).toBe(SITE_URL);
	});

	it('falls back to siteUrl for malformed origins', () => {
		const result = resolveAppBaseUrl(requestWithOrigin('not-a-url'), { siteUrl: SITE_URL });
		expect(result).toBe(SITE_URL);
	});

	it('falls back to siteUrl for non-http schemes', () => {
		const result = resolveAppBaseUrl(requestWithOrigin('ftp://files.example.com'), {
			siteUrl: SITE_URL,
		});
		expect(result).toBe(SITE_URL);
	});

	it('accepts http origins for localhost development', () => {
		const result = resolveAppBaseUrl(requestWithOrigin('http://localhost:5173'), {
			siteUrl: SITE_URL,
		});
		expect(result).toBe('http://localhost:5173');
	});

	it('preserves non-default ports on accepted origins', () => {
		const result = resolveAppBaseUrl(requestWithOrigin('https://staging.example.com:8443'), {
			siteUrl: SITE_URL,
		});
		expect(result).toBe('https://staging.example.com:8443');
	});
});

describe('parseAllowedOrigins', () => {
	it('returns an empty list for missing values', () => {
		expect(parseAllowedOrigins(undefined)).toEqual([]);
		expect(parseAllowedOrigins('')).toEqual([]);
	});

	it('splits comma-separated values and trims whitespace', () => {
		expect(parseAllowedOrigins('https://a.com, https://b.com ')).toEqual([
			'https://a.com',
			'https://b.com',
		]);
	});
});
