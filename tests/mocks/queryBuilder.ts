import { vi } from 'vitest';

/**
 * Creates a mock Supabase query builder that mimics the thenable nature
 * of the real PostgrestFilterBuilder. When the chain ends without a
 * terminal Promise-returning method (e.g. .order() or .single()), awaiting
 * the builder resolves to { data: null, error: null }.
 */
export function createDefaultQueryBuilder() {
	const builder = {
		select: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		upsert: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		neq: vi.fn().mockReturnThis(),
		gt: vi.fn().mockReturnThis(),
		gte: vi.fn().mockReturnThis(),
		lt: vi.fn().mockReturnThis(),
		lte: vi.fn().mockReturnThis(),
		like: vi.fn().mockReturnThis(),
		ilike: vi.fn().mockReturnThis(),
		is: vi.fn().mockReturnThis(),
		in: vi.fn().mockReturnThis(),
		contains: vi.fn().mockReturnThis(),
		containedBy: vi.fn().mockReturnThis(),
		rangeGt: vi.fn().mockReturnThis(),
		rangeGte: vi.fn().mockReturnThis(),
		rangeLt: vi.fn().mockReturnThis(),
		rangeLte: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		range: vi.fn().mockReturnThis(),
		single: vi.fn().mockResolvedValue({ data: null, error: null }),
		maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
		// biome-ignore lint/suspicious/noThenProperty: Supabase client builder is inherently thenable
		then: (
			onfulfilled: (value: { data: unknown; error: unknown }) => unknown,
			onrejected?: (reason: unknown) => unknown,
		) => Promise.resolve({ data: null, error: null }).then(onfulfilled, onrejected),
	};

	return builder;
}
