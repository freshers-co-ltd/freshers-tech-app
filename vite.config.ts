import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		VitePWA({
			strategies: 'injectManifest',
			registerType: 'autoUpdate',
			injectRegister: 'auto',
			includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon-source.svg'],
			srcDir: 'src',
			filename: 'sw.ts',
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
				cleanupOutdatedCaches: true,
				clientsClaim: true,
				skipWaiting: true,
			},
			devOptions: {
				enabled: true,
				type: 'module',
				suppressWarnings: true,
			},
			manifest: {
				name: 'Freshers PWA',
				short_name: 'Freshers',
				description: 'Professional cleaning service platform.',
				start_url: '/',
				display: 'standalone',
				background_color: '#ffffff',
				theme_color: '#ffffff',
				icons: [
					{
						src: 'pwa-64x64.png',
						sizes: '64x64',
						type: 'image/png',
					},
					{
						src: 'pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png',
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any',
					},
					{
						src: 'maskable-icon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable',
					},
				],
			},
		}),
	],
	server: {
		host: 'localhost',
		port: 5173,
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'~': path.resolve(__dirname, './tests'),
		},
	},
	build: {
		target: 'esnext',
		sourcemap: true,
		chunkSizeWarningLimit: 1000,
	},
});
