'use client';

import { useMemo, useState } from 'react';
import { toast } from '@/components/Toast';
import type { Property } from '@/features/properties/types';
import { useBucketConfig } from '@/hooks/useBucketConfig';
import { mediaService } from '@/lib/mediaService';

const EXTRA_IMAGES_LIMIT = 10;

export function usePropertyImageUpload(initialData?: Property) {
	const [mainImage, setMainImage] = useState<File[] | null>(null);
	const [extraImages, setExtraImages] = useState<File[] | null>([]);
	const [isUploading, setIsUploading] = useState(false);
	const [extraImagesPaths, setExtraImagesPaths] = useState<string[]>(
		initialData?.extra_images_urls || [],
	);

	const bucketConfig = useBucketConfig('property-media', {
		'image/*': ['.jpg', '.jpeg', '.png'],
	});

	const remainingSlots = useMemo(
		() => Math.max(0, EXTRA_IMAGES_LIMIT - extraImagesPaths.length),
		[extraImagesPaths.length],
	);

	const removeExistingImage = (pathToRemove: string) => {
		setExtraImagesPaths((prev) => prev.filter((path) => path !== pathToRemove));
	};

	const uploadImages = async (userId: string) => {
		setIsUploading(true);
		try {
			let mainImagePath = initialData?.main_image_url || '';

			if (mainImage?.[0]) {
				const { path: uploadedPath, error } = await mediaService.uploadMedia(
					userId,
					mainImage[0],
					'property-media',
				);
				if (error) {
					throw new Error(error);
				}
				if (uploadedPath) {
					mainImagePath = uploadedPath;
				}
			}

			let finalExtraImagesPaths = [...extraImagesPaths];

			if (extraImages && extraImages.length > 0) {
				const uploadPromises = extraImages.map((file) =>
					mediaService.uploadMedia(userId, file, 'property-media'),
				);
				const results = await Promise.allSettled(uploadPromises);

				const failures = results.filter((r) => r.status === 'rejected').length;
				if (failures > 0) {
					toast.error(`${failures} image(s) failed to upload.`);
				}

				const newPaths = results
					.map((res) => (res.status === 'fulfilled' && res.value.path ? res.value.path : null))
					.filter((path): path is string => !!path);

				finalExtraImagesPaths = [...finalExtraImagesPaths, ...newPaths];
				setExtraImagesPaths(finalExtraImagesPaths);
				setExtraImages([]);
			}

			return { mainImagePath, finalExtraImagesPaths };
		} finally {
			setIsUploading(false);
		}
	};

	return {
		mainImage,
		setMainImage,
		extraImages,
		setExtraImages,
		extraImagesPaths,
		removeExistingImage,
		remainingSlots,
		isUploading,
		bucketConfig,
		uploadImages,
	};
}
