import { configure } from '@testing-library/dom';
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from '../server';

vi.mock('@/lib/supabaseClient', () => ({
	supabase: {
		auth: {
			signInWithPassword: vi.fn().mockImplementation(async ({ email, password }) => {
				const res = await fetch('*/auth/v1/token', {
					method: 'POST',
					body: JSON.stringify({ email, password }),
				});
				const responseData = await res.json();
				if (!res.ok) {
					return {
						data: { user: null, session: null },
						error: { message: responseData.error_description || 'Invalid credentials' },
					};
				}
				return { data: responseData, error: null };
			}),
			signUp: vi.fn().mockImplementation(async () => {
				const res = await fetch('*/auth/v1/signup', { method: 'POST' });
				const responseData = await res.json();
				return { data: responseData, error: res.ok ? null : responseData };
			}),
			getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
			onAuthStateChange: vi.fn(() => ({
				data: { subscription: { unsubscribe: vi.fn() } },
			})),
		},
	},
}));

vi.mock('sonner', () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
		loading: vi.fn(),
		dismiss: vi.fn(),
	},
}));

configure({
	getElementError: (message) => {
		const error = new Error(message ?? undefined);
		error.name = 'TestingLibraryElementError';
		return error;
	},
});

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
	server.resetHandlers();
	vi.clearAllMocks();
});

afterAll(() => server.close());
