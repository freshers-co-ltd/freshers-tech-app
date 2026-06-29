import { vi } from 'vitest';
import { createDefaultQueryBuilder } from '~/mocks/queryBuilder';
import { mockSupabase } from '~/mocks/supabaseClient';

/**
 * Override `mockSupabase.from` to return custom data for one or more tables.
 * All tables not in the overrides map fall through to the default query builder.
 *
 * Usage:
 *   const cleanup = mockTableData('cleanings', [buildCleaning()]);
 *   // ... run test ...
 *   cleanup();
 *
 * For multiple tables:
 *   const cleanup = mockTableData({
 *     cleanings: { data: [buildCleaning()] },
 *     properties: { data: [buildProperty()] },
 *   });
 */
export function mockTableData(
	tableOrMap: string | Record<string, { data: unknown; error?: string | null }>,
	dataOrUndefined?: unknown,
	errorOrUndefined?: string | null,
) {
	const previousFrom = mockSupabase.from;

	const tableMap: Record<string, { data: unknown; error?: string | null }> =
		typeof tableOrMap === 'string'
			? { [tableOrMap]: { data: dataOrUndefined, error: errorOrUndefined ?? null } }
			: tableOrMap;

	mockSupabase.from = vi.fn((table: string) => {
		const override = tableMap[table];
		if (override) {
			const { data, error } = override;
			const result = error ? { data: null, error: { message: error } } : { data, error: null };
			return {
				...createDefaultQueryBuilder(),
				select: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				upsert: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: error ? null : Array.isArray(data) ? data[0] : data,
					error: error ? { message: error } : null,
				}),
				maybeSingle: vi.fn().mockResolvedValue({
					data: error ? null : data,
					error: error ? { message: error } : null,
				}),
				// biome-ignore lint/suspicious/noThenProperty: Supabase client builder is inherently thenable
				then: (
					onfulfilled: (value: { data: unknown; error: unknown }) => unknown,
					onrejected?: (reason: unknown) => unknown,
				) => Promise.resolve(result).then(onfulfilled, onrejected),
			};
		}
		return createDefaultQueryBuilder();
	});

	return () => {
		mockSupabase.from = previousFrom;
	};
}

/**
 * Override `mockSupabase.rpc` to return custom data for one or more RPC names.
 * All RPCs not in the overrides map fall through to the default (null data, no error).
 *
 * Usage:
 *   const cleanup = mockRpcData('admin_get_all_cleanings', [buildAdminCleaning()]);
 */
export function mockRpcData(
	nameOrMap: string | Record<string, { data: unknown; error?: string | null }>,
	dataOrUndefined?: unknown,
	errorOrUndefined?: string | null,
) {
	const previousRpc = mockSupabase.rpc;

	const rpcMap: Record<string, { data: unknown; error?: string | null }> =
		typeof nameOrMap === 'string'
			? { [nameOrMap]: { data: dataOrUndefined, error: errorOrUndefined ?? null } }
			: nameOrMap;

	mockSupabase.rpc = vi.fn((name: string, _params?: unknown) => {
		const override = rpcMap[name];
		if (override) {
			const { data, error } = override;
			return error ? { data: null, error: { message: error } } : { data, error: null };
		}
		return { data: null, error: null };
	});

	return () => {
		mockSupabase.rpc = previousRpc;
	};
}

/**
 * Set the current authenticated user's role in the mock.
 * The default is 'host'.
 */
export function setMockUserRole(role: 'host' | 'cleaner' | 'admin') {
	const currentUser = {
		id: 'user_123',
		email: 'test@example.com',
		aud: 'authenticated',
		role: 'authenticated',
		email_confirmed_at: new Date().toISOString(),
		created_at: new Date().toISOString(),
		last_sign_in_at: new Date().toISOString(),
		app_metadata: { provider: 'email', providers: ['email'] },
		user_metadata: { full_name: 'Test User', role },
		identities: [],
	};

	const currentSession = {
		access_token: 'mock-access-token',
		token_type: 'bearer',
		expires_in: 3600,
		refresh_token: 'mock-refresh-token',
		user: currentUser,
	};

	mockSupabase.auth.getUser.mockResolvedValue({
		data: { user: currentUser },
		error: null,
	});

	mockSupabase.auth.getSession.mockResolvedValue({
		data: { session: currentSession },
		error: null,
	});
}
