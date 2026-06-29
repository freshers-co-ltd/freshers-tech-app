/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
	({ url }) => url.hostname.includes('supabase.co') && url.pathname.startsWith('/rest/v1/'),
	new NetworkFirst({
		cacheName: 'supabase-api',
		plugins: [
			new ExpirationPlugin({
				maxEntries: 50,
				maxAgeSeconds: 60 * 60 * 24,
			}),
		],
		networkTimeoutSeconds: 5,
	}),
);

registerRoute(
	({ url }) => url.hostname.includes('supabase.co') && url.pathname.startsWith('/storage/v1/'),
	new StaleWhileRevalidate({
		cacheName: 'supabase-storage',
		plugins: [
			new ExpirationPlugin({
				maxEntries: 100,
				maxAgeSeconds: 60 * 60 * 24 * 7,
			}),
		],
	}),
);

self.skipWaiting();
clientsClaim();

interface PushNotificationData {
	title: string;
	body?: string;
	icon?: string;
	badge?: string;
	link?: string;
	data?: Record<string, unknown>;
}

self.addEventListener('push', async (event: PushEvent) => {
	const devLog = (...args: unknown[]) => {
		if (import.meta.env.DEV) {
			console.log('[SW]', ...args);
		}
	};

	devLog('Push event received', event);
	devLog('Notification permission:', Notification.permission);
	devLog('Registration:', self.registration);

	let data: PushNotificationData;

	try {
		const rawData = event.data?.json();
		devLog('Raw push data:', rawData);
		data = rawData ?? {
			title: 'Freshers',
			body: 'You have a new notification',
		};
	} catch (e) {
		devLog('Failed to parse push data:', e);
		data = {
			title: 'Freshers',
			body: 'You have a new notification',
		};
	}

	devLog('Parsed notification data:', data);

	const options: NotificationOptions = {
		body: data.body,
		icon: data.icon || '/pwa-192x192.png',
		badge: data.badge || '/pwa-64x64.png',
		data: data.data,
		tag: 'freshers-notification',
	};

	devLog('Showing notification with options:', options);

	event.waitUntil(
		(async () => {
			try {
				const result = await self.registration.showNotification(data.title, options);
				devLog('Notification shown successfully:', result);

				const unreadCount = data.data?.unreadCount as number | undefined;
				if (unreadCount !== undefined && unreadCount > 0) {
					if ('setAppBadge' in navigator) {
						devLog('Setting badge count:', unreadCount);
						await navigator.setAppBadge(unreadCount);
					}
				} else {
					if ('setAppBadge' in navigator) {
						devLog('Clearing badge');
						await navigator.clearAppBadge();
					}
				}
			} catch (err) {
				console.error('[SW] Failed to show notification:', err);
			}
		})(),
	);
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
	const notificationData = event.notification.data as { link?: string } | undefined;
	const link = notificationData?.link;

	if (!link) {
		return;
	}

	const targetUrl = new URL(link, self.location.origin).href;

	if (link) {
		event.waitUntil(
			self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
				for (const client of clientList) {
					if (client.url === targetUrl && 'focus' in client) {
						return client.focus();
					}
				}

				for (const client of clientList) {
					const clientUrl = new URL(client.url).pathname;
					const targetPath = new URL(targetUrl).pathname;

					if (clientUrl === targetPath && 'focus' in client) {
						return client.focus();
					}
				}

				if (self.clients.openWindow) {
					return self.clients.openWindow(targetUrl);
				}
			}),
		);
	}
});

self.addEventListener('pushsubscriptionchange', (event: PushSubscriptionChangeEvent) => {
	const devLog = (...args: unknown[]) => {
		if (import.meta.env.DEV) {
			console.log('[SW]', ...args);
		}
	};

	devLog('Push subscription changed:', event);

	event.waitUntil(
		(async () => {
			try {
				const clients = await self.clients.matchAll({ type: 'window' });

				if (clients.length === 0) {
					devLog('No clients available to handle subscription update');
					return;
				}

				const client = clients[0];
				if (client) {
					client.postMessage({
						type: 'PUSH_SUBSCRIPTION_EXPIRED',
					});
				}

				devLog('Notified clients about subscription expiration');
			} catch (err) {
				console.error('[SW] Error handling subscription change:', err);
			}
		})(),
	);
});
