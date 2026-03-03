import { defineConfig } from 'vitest/config';
import viteConfig from './vite.config';

process.env.DEBUG_PRINT_LIMIT = '0';

export default defineConfig({
	...viteConfig,
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['tests/**/*.test.tsx', 'tests/**/*.test.ts'],
		exclude: ['tests/e2e/**'],
		setupFiles: ['./tests/unit/unit.setup.ts', './tests/integration/integration.setup.ts'],
	},
});
