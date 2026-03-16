import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

configure({
	getElementError: (message) => {
		const error = new Error(message ?? undefined);
		error.name = 'TestingLibraryElementError';
		return error;
	},
});

afterEach(() => {
	cleanup();
});

class ResizeObserverMock {
	observe() {}
	unobserve() {}
	disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);
