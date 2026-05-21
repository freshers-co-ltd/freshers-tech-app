import { configure } from '@testing-library/dom';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';
import { resetSupabaseMocks } from '~/mocks/supabaseClient';

beforeAll(() => {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});

	// jsdom does not implement PointerEvent; Radix UI Select depends on it.
	if (typeof PointerEvent === 'undefined') {
		// @ts-expect-error - polyfilling PointerEvent for jsdom
		globalThis.PointerEvent = class extends MouseEvent {
			readonly pointerType: string;
			constructor(type: string, init?: PointerEventInit) {
				super(type, init);
				this.pointerType = init?.pointerType ?? 'mouse';
			}
		};
	}
	// jsdom does not implement Element.hasPointerCapture;
	// Radix UI Select depends on it to open the dropdown.
	if (!Element.prototype.hasPointerCapture) {
		Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
	}

	// jsdom does not implement Element.scrollIntoView;
	// Radix UI SelectContent calls scrollIntoView on the selected item.
	if (!Element.prototype.scrollIntoView) {
		Element.prototype.scrollIntoView = vi.fn();
	}
});

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
	cleanup();
	// Remove leftover portal content that cleanup() misses (Radix UI portals
	// render directly into document.body, and nuqs may cache query state).
	document.body.innerHTML = '';
	// nuqs reads window.location.search to initialise query state on mount.
	// Clear it so the next test starts with a clean URL.
	if (window.location.search) {
		window.history.replaceState(null, '', window.location.pathname + window.location.hash);
	}
	vi.clearAllMocks();
	resetSupabaseMocks();
	localStorage.clear();
	sessionStorage.clear();
});
