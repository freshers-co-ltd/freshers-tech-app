'use client';

import { useMemo } from 'react';
import { getBucketConfig, mimeTypesToAccept } from '@/lib/mediaService';

type BucketConfigState = {
	maxSize: number;
	accept: Record<string, string[]>;
};

export function useBucketConfig(
	bucketName: string,
	fallbackAccept: Record<string, string[]> = { 'image/*': ['.jpg', '.jpeg', '.png'] },
): BucketConfigState {
	return useMemo(() => {
		const config = getBucketConfig(bucketName);
		return {
			maxSize: config.fileSizeLimit,
			accept:
				config.allowedMimeTypes.length > 0
					? mimeTypesToAccept(config.allowedMimeTypes)
					: fallbackAccept,
		};
	}, [bucketName, fallbackAccept]);
}
