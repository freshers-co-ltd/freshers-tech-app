import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const STORAGE_KEY = 'sb-auth-token';

if (!supabaseUrl || !supabaseAnonKey) {
	if (import.meta.env.DEV) {
		console.warn(
			'Supabase credentials missing. Ensure you have a .env.local file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
		);
	} else {
		console.error('Supabase environment variables are not defined.');
	}
}

let authChannel: BroadcastChannel | null = null;

let suppressSessionBroadcast = false;

export const setSuppressSessionBroadcast = (value: boolean): void => {
	suppressSessionBroadcast = value;
};

const getAuthChannel = (): BroadcastChannel => {
	if (!authChannel) {
		authChannel = new BroadcastChannel('auth_sync_channel');

		authChannel.onmessage = (event: MessageEvent) => {
			if (event.data.type === 'REQUEST_SESSION') {
				const session = window.sessionStorage.getItem(STORAGE_KEY);
				if (session) {
					authChannel?.postMessage({ type: 'SEND_SESSION', session });
				}
			}
			if (event.data.type === 'LOGOUT') {
				if (window.localStorage.getItem('trust_device') === 'true') {
					return;
				}
				window.sessionStorage.removeItem(STORAGE_KEY);
				if (window.location.pathname !== '/login') {
					window.location.href = '/login';
				}
			}
		};

		window.addEventListener('beforeunload', () => {
			authChannel?.close();
			authChannel = null;
		});
	}
	return authChannel;
};

const getAuthStorage = () => {
	const isTrusted = () => window.localStorage.getItem('trust_device') === 'true';

	return {
		getItem: (key: string) => {
			return window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
		},
		setItem: (key: string, value: string) => {
			if (isTrusted()) {
				window.localStorage.setItem(key, value);
			} else {
				window.sessionStorage.setItem(key, value);
			}
			if (!suppressSessionBroadcast) {
				getAuthChannel().postMessage({ type: 'SEND_SESSION', session: value });
			}
		},
		removeItem: (key: string) => {
			if (window.localStorage.getItem('trust_device') === 'true') {
				return;
			}
			window.localStorage.removeItem(key);
			window.sessionStorage.removeItem(key);
			getAuthChannel().postMessage({ type: 'LOGOUT' });
		},
	};
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
	auth: {
		persistSession: true,
		storage: getAuthStorage(),
		autoRefreshToken: true,
		detectSessionInUrl: true,
		storageKey: STORAGE_KEY,
	},
});
