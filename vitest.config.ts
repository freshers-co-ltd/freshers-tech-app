import path from 'node:path';
import { defineConfig } from 'vitest/config';
import viteConfig from './vite.config';

process.env.DEBUG_PRINT_LIMIT = '0';

export default defineConfig({
	...viteConfig,
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'~': path.resolve(__dirname, './tests'),
		},
	},
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['tests/**/*.test.{ts,tsx}'],
		exclude: ['tests/e2e/**'],
		setupFiles: ['./tests/unit/unit.setup.ts', './tests/integration/integration.setup.ts'],
	},
});
