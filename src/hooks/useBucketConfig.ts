'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_FILE_SIZE_LIMIT, getBucketConfig, mimeTypesToAccept } from '@/lib/mediaService';

type BucketConfigState = {
	maxSize: number;
	accept: Record<string, string[]>;
};

export function useBucketConfig(
	bucketName: string,
	fallbackAccept: Record<string, string[]> = { 'image/*': ['.jpg', '.jpeg', '.png'] },
): BucketConfigState {
	const [bucketConfig, setBucketConfig] = useState<BucketConfigState>({
		maxSize: DEFAULT_FILE_SIZE_LIMIT,
		accept: fallbackAccept,
	});

	useEffect(() => {
		let cancelled = false;
		getBucketConfig(bucketName)
			.then((config) => {
				if (cancelled) {
					return;
				}
				setBucketConfig({
					maxSize: config.fileSizeLimit,
					accept:
						config.allowedMimeTypes.length > 0
							? mimeTypesToAccept(config.allowedMimeTypes)
							: fallbackAccept,
				});
			})
			.catch((err) => {
				if (import.meta.env.DEV) {
					console.error('[Bucket] Failed to fetch bucket config', err);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [bucketName, fallbackAccept]);

	return bucketConfig;
}
