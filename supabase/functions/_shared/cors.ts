// @ts-nocheck
export function getAllowedOrigin(req: Request): string {
	const allowed = Deno.env.get('CORS_ORIGIN');
	const requestOrigin = req.headers.get('Origin');

	if (!requestOrigin) {
		return '*';
	}

	if (allowed) {
		const origins = allowed.split(',').map((origin) => origin.trim());
		if (origins.includes(requestOrigin)) {
			return requestOrigin;
		}
	}

	return requestOrigin;
}

export function corsHeaders(origin: string): Record<string, string> {
	return {
		'Access-Control-Allow-Origin': origin,
		'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		Vary: 'Origin',
	};
}

export function jsonResponse(body: unknown, status: number, origin: string): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
	});
}

export function errorJson(error: unknown): string {
	if (typeof error === 'string') return JSON.stringify({ error });
	if (error instanceof Error) return JSON.stringify({ error: error.message });
	return JSON.stringify({ error: String(error) });
}