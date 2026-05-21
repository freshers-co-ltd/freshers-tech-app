import { configure } from '@testing-library/dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { resetSupabaseMocks } from '~/mocks/supabaseClient';

vi.mock('@/lib/supabaseClient', () => import('~/mocks/supabaseClient'));

vi.mock('@/components/Toast', () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
		warning: vi.fn(),
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

afterEach(() => {
	vi.clearAllMocks();
	resetSupabaseMocks();
	localStorage.clear();
	sessionStorage.clear();
});
