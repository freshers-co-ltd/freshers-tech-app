import { vi } from 'vitest';
import { createDefaultQueryBuilder } from '~/mocks/queryBuilder';

const defaultUser = {
	id: 'user_123',
	email: 'test@example.com',
	aud: 'authenticated',
	role: 'authenticated',
	email_confirmed_at: new Date().toISOString(),
	created_at: new Date().toISOString(),
	last_sign_in_at: new Date().toISOString(),
	app_metadata: { provider: 'email', providers: ['email'] },
	user_metadata: { full_name: 'Test User', role: 'host' },
	identities: [],
};

const defaultSession = {
	access_token: 'mock-access-token',
	token_type: 'bearer',
	expires_in: 3600,
	refresh_token: 'mock-refresh-token',
	user: defaultUser,
};

let authCallback: ((event: string, session: unknown) => void) | null = null;

function fireAuthEvent(event: string, session: unknown) {
	if (authCallback) {
		authCallback(event, session);
	}
}

export const mockSupabase = {
	auth: {
		getSession: vi.fn().mockResolvedValue({ data: { session: defaultSession }, error: null }),
		getUser: vi.fn().mockResolvedValue({ data: { user: defaultUser }, error: null }),
		signInWithPassword: vi
			.fn()
			.mockImplementation(async (credentials: { email: string; password: string }) => {
				if (credentials.email === 'wrong@example.com' || credentials.password === 'wrongpass') {
					return {
						data: { user: null, session: null },
						error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
					};
				}
				fireAuthEvent('SIGNED_IN', defaultSession);
				return { data: { user: defaultUser, session: defaultSession }, error: null };
			}),
		signUp: vi.fn().mockImplementation(async (credentials: { email: string; password: string }) => {
			if (credentials.email === 'existing@example.com') {
				return {
					data: { user: null, session: null },
					error: { code: 'user_already_exists', message: 'User already registered' },
				};
			}
			fireAuthEvent('SIGNED_IN', defaultSession);
			return { data: { user: defaultUser, session: defaultSession }, error: null };
		}),
		signOut: vi.fn().mockResolvedValue({ error: null }),
		setSession: vi.fn().mockResolvedValue({ data: { session: defaultSession }, error: null }),
		refreshSession: vi.fn().mockResolvedValue({ data: { session: defaultSession }, error: null }),
		verifyOtp: vi
			.fn()
			.mockResolvedValue({ data: { user: defaultUser, session: defaultSession }, error: null }),
		resend: vi.fn().mockResolvedValue({ data: {}, error: null }),
		resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
		exchangeCodeForSession: vi
			.fn()
			.mockResolvedValue({ data: { user: defaultUser, session: defaultSession }, error: null }),
		updateUser: vi.fn().mockResolvedValue({ data: { user: defaultUser }, error: null }),
		onAuthStateChange: vi
			.fn()
			.mockImplementation((callback: (event: string, session: unknown) => void) => {
				authCallback = callback;
				callback('INITIAL_SESSION', defaultSession);
				return { data: { subscription: { unsubscribe: vi.fn() } } };
			}),
	},
	from: vi.fn().mockImplementation((_table: string) => createDefaultQueryBuilder()),
	rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
	channel: vi.fn().mockReturnValue({
		on: vi.fn().mockReturnThis(),
		subscribe: vi.fn().mockImplementation((callback?: (status: string) => void) => {
			callback?.('SUBSCRIBED');
			return { unsubscribe: vi.fn() };
		}),
	}),
	removeChannel: vi.fn(),
	getChannels: vi.fn().mockReturnValue([]),
	storage: {
		from: vi.fn().mockReturnValue({
			upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
			getPublicUrl: vi
				.fn()
				.mockReturnValue({ data: { publicUrl: 'https://example.com/test.jpg' } }),
			remove: vi.fn().mockResolvedValue({ data: {}, error: null }),
			list: vi.fn().mockResolvedValue({ data: [], error: null }),
		}),
	},
	realtime: { subscribe: vi.fn() },
};

export const supabase = mockSupabase;

export const setSuppressSessionBroadcast = vi.fn();

export function resetSupabaseMocks() {
	authCallback = null;
}
