import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',

	webServer: process.env.PLAYWRIGHT_URL
		? undefined
		: {
				command: 'npm run build && npm run preview',
				url: 'http://localhost:4173',
				reuseExistingServer: !process.env.CI,
				timeout: 120 * 1000,
				stdout: 'pipe',
				stderr: 'pipe',
			},

	use: {
		baseURL: process.env.PLAYWRIGHT_URL || 'http://localhost:4173',
		trace: 'on-first-retry',
		serviceWorkers: 'block',
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'Mobile Chrome',
			use: { ...devices['Pixel 7'] },
		},
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] },
		},
		{
			name: 'Mobile Safari',
			use: { ...devices['iPhone 15'] },
		},
	],
});
