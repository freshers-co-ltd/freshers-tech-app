/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

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
	console.log('[SW] Push event received', event);
	console.log('[SW] Notification permission:', Notification.permission);
	console.log('[SW] Registration:', self.registration);

	let data: PushNotificationData;

	try {
		const rawData = event.data?.json();
		console.log('[SW] Raw push data:', rawData);
		data = rawData ?? {
			title: 'Cleaner Hire',
			body: 'You have a new notification',
		};
	} catch (e) {
		console.log('[SW] Failed to parse push data:', e);
		data = {
			title: 'Cleaner Hire',
			body: 'You have a new notification',
		};
	}

	console.log('[SW] Parsed notification data:', data);

	const options: NotificationOptions = {
		body: data.body,
		icon: data.icon || '/pwa-192x192.png',
		badge: data.badge || '/pwa-64x64.png',
		data: data.data,
		tag: 'cleaner-hire-notification',
	};

	console.log('[SW] Showing notification with options:', options);

	event.waitUntil(
		(async () => {
			try {
				const result = await self.registration.showNotification(data.title, options);
				console.log('[SW] Notification shown successfully:', result);

				const unreadCount = data.data?.unreadCount as number | undefined;
				if (unreadCount !== undefined && unreadCount > 0) {
					if ('setAppBadge' in navigator) {
						console.log('[SW] Setting badge count:', unreadCount);
						await navigator.setAppBadge(unreadCount);
					}
				} else {
					if ('setAppBadge' in navigator) {
						console.log('[SW] Clearing badge');
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
	event.notification.close();

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
