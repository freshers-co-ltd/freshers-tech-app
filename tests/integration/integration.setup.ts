import { configure } from '@testing-library/dom';
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '../server';

configure({
	getElementError: (message) => {
		const error = new Error(message ?? undefined);
		error.name = 'TestingLibraryElementError';
		return error;
	},
});

// Establish API mocking before all tests.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => server.close());
