import { useCallback, useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type PwaPlatform =
	| 'ios-safari'
	| 'android-chrome'
	| 'desktop-chrome'
	| 'desktop-other'
	| 'installed';

function detectPlatform(): PwaPlatform {
	if (typeof window === 'undefined') {
		return 'desktop-other';
	}

	const isStandalone =
		window.matchMedia('(display-mode: standalone)').matches ||
		('standalone' in window.navigator && window.navigator.standalone);

	if (isStandalone) {
		return 'installed';
	}

	const ua = navigator.userAgent;

	if (/iPhone|iPad|iPod/.test(ua) && !/Android/.test(ua)) {
		return 'ios-safari';
	}

	if (/Android/.test(ua)) {
		return 'android-chrome';
	}

	return 'desktop-other';
}

export function usePwaInstall() {
	const [platform, setPlatform] = useState<PwaPlatform>(detectPlatform);
	const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
	const [canInstall, setCanInstall] = useState(false);
	const [installed, setInstalled] = useState(false);

	useEffect(() => {
		setPlatform(detectPlatform());
	}, []);

	useEffect(() => {
		const handler = (event: Event) => {
			event.preventDefault();
			deferredPrompt.current = event as BeforeInstallPromptEvent;
			setCanInstall(true);
			setPlatform('desktop-chrome');
		};

		window.addEventListener('beforeinstallprompt', handler);

		return () => {
			window.removeEventListener('beforeinstallprompt', handler);
		};
	}, []);

	useEffect(() => {
		const handler = () => {
			setInstalled(true);
			setPlatform('installed');
			setCanInstall(false);
			deferredPrompt.current = null;
		};

		window.addEventListener('appinstalled', handler);

		return () => {
			window.removeEventListener('appinstalled', handler);
		};
	}, []);

	const install = useCallback(async () => {
		const promptEvent = deferredPrompt.current;
		if (!promptEvent) {
			return;
		}

		deferredPrompt.current = null;
		setCanInstall(false);

		await promptEvent.prompt();
		const result = await promptEvent.userChoice;

		if (result.outcome === 'accepted') {
			setInstalled(true);
			setPlatform('installed');
		}
	}, []);

	const isInstalled = platform === 'installed' || installed;

	return {
		platform,
		isInstalled,
		canInstall,
		install,
	} as const;
}
