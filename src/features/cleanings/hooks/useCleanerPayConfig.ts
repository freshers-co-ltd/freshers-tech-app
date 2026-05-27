'use client';

import { useEffect, useState } from 'react';
import { cleaningsService } from '@/features/cleanings/services/cleaningsService';
import type { CleanerPayConfig } from '@/features/cleanings/types';

let cachedConfig: CleanerPayConfig | null = null;
let fetchPromise: Promise<void> | null = null;

export function useCleanerPayConfig(): CleanerPayConfig | null {
	const [config, setConfig] = useState<CleanerPayConfig | null>(cachedConfig);

	useEffect(() => {
		if (cachedConfig) {
			return;
		}

		if (!fetchPromise) {
			fetchPromise = cleaningsService.getCleanerPayConfig().then((result) => {
				if (result.data) {
					cachedConfig = result.data;
					setConfig(result.data);
				}
			});
		} else {
			fetchPromise.then(() => {
				setConfig(cachedConfig);
			});
		}
	}, []);

	return config;
}
