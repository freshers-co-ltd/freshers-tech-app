'use client';

import { useEffect, useState } from 'react';
import type { StorageBucket } from '@/lib/mediaService';
import { mediaService } from '@/lib/mediaService';

export function useMediaUrl(
	path: string | null | undefined,
	bucket: StorageBucket,
	expiresIn = 3600,
): string {
	const [url, setUrl] = useState<string>('/placeholder-image.webp');

	useEffect(() => {
		if (!path || path === 'Placeholder' || path.trim() === '') {
			setUrl('/placeholder-image.webp');
			return;
		}

		if (path.startsWith('http') || path.startsWith('blob:')) {
			setUrl(path);
			return;
		}

		let cancelled = false;

		mediaService.getSignedUrl(path, bucket, expiresIn).then((signedUrl) => {
			if (!cancelled) {
				setUrl(signedUrl ?? '/placeholder-image.webp');
			}
		});

		return () => {
			cancelled = true;
		};
	}, [path, bucket, expiresIn]);

	return url;
}
