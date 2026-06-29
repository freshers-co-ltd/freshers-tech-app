'use client';

import { useEffect, useState } from 'react';
import type { StorageBucket } from '@/lib/mediaService';
import { mediaService } from '@/lib/mediaService';

const FALLBACK = '/placeholder-image.webp';

export function useMediaUrls(
	paths: string[] | null | undefined,
	bucket: StorageBucket,
	expiresIn = 3600,
): string[] {
	const [urls, setUrls] = useState<string[]>([]);

	useEffect(() => {
		const validPaths = paths?.filter(
			(p): p is string => !!p && p !== 'Placeholder' && p.trim() !== '',
		);

		if (!validPaths || validPaths.length === 0) {
			setUrls([]);
			return;
		}

		let cancelled = false;

		const resolveUrls = async () => {
			const results = await Promise.all(
				validPaths.map(async (p) => {
					if (p.startsWith('http') || p.startsWith('blob:')) {
						return p;
					}
					const signedUrl = await mediaService.getSignedUrl(p, bucket, expiresIn);
					return signedUrl ?? FALLBACK;
				}),
			);

			if (!cancelled) {
				setUrls(results);
			}
		};

		resolveUrls();

		return () => {
			cancelled = true;
		};
	}, [paths, bucket, expiresIn]);

	return urls;
}
