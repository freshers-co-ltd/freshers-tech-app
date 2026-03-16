const AUTH_CHANNEL = 'auth_sync_channel';
const STORAGE_KEY = 'sb-auth-token';

export const initAuthSync = (): Promise<void> => {
	return new Promise((resolve) => {
		if (typeof window === 'undefined') {
			resolve();
			return;
		}

		const isTrusted = window.localStorage.getItem('trust_device') === 'true';
		const localSession = window.sessionStorage.getItem(STORAGE_KEY);

		if (isTrusted || localSession) {
			resolve();
			return;
		}

		const channel = new BroadcastChannel(AUTH_CHANNEL);
		let resolved = false;

		const timeout = setTimeout(() => {
			if (!resolved) {
				resolved = true;
				channel.close();
				resolve();
			}
		}, 600);

		channel.onmessage = (event: MessageEvent) => {
			if (event.data.type === 'SEND_SESSION' && event.data.session) {
				window.sessionStorage.setItem(STORAGE_KEY, event.data.session);
				if (!resolved) {
					resolved = true;
					clearTimeout(timeout);
					channel.close();
					resolve();
				}
			}
		};

		channel.postMessage({ type: 'REQUEST_SESSION' });
	});
};
