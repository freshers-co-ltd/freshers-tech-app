'use client';

import { useCallback, useState } from 'react';
import { toast } from '@/components/Toast';
import { DICT } from '@/dictionary';
import type { CleaningRequest } from '@/features/cleanings/types';
import { useGeolocation } from '@/hooks/useGeolocation';

interface UseClockInOutOptions {
	cleaning: CleaningRequest;
	onClockIn: (cleaningId: string) => Promise<{ success: boolean }>;
}

interface UseClockInOutResult {
	canClockIn: boolean;
	isProcessing: boolean;
	onClockIn: () => Promise<void>;
}

export function useClockInOut({ cleaning, onClockIn }: UseClockInOutOptions): UseClockInOutResult {
	const { checkProximity } = useGeolocation();
	const [isProcessing, setIsProcessing] = useState(false);

	const scheduledStart = new Date(cleaning.scheduled_start);
	const now = new Date();
	const minClockInTime = new Date(scheduledStart.getTime() - 10 * 60_000);
	const canClockIn = now.toDateString() === scheduledStart.toDateString() && now >= minClockInTime;

	const handleClockIn = useCallback(async () => {
		if (!cleaning.property?.postcode) {
			return;
		}

		setIsProcessing(true);
		try {
			const { isNear, distance, error } = await checkProximity(cleaning.property.postcode);
			if (!isNear) {
				if (error) {
					toast.error(error);
				} else {
					toast.error(
						`${DICT.CLEANINGS.DETAIL.CLOCK_IN.MUST_BE_AT_PROPERTY} Current distance: ${Math.round(distance)}m`,
					);
				}
				return;
			}
			await onClockIn(cleaning.id);
			toast.success(DICT.CLEANINGS.DETAIL.CLOCK_IN.SUCCESS);
		} catch {
			toast.error(DICT.CLEANINGS.DETAIL.CLOCK_IN.FAILED);
		} finally {
			setIsProcessing(false);
		}
	}, [cleaning, checkProximity, onClockIn]);

	return {
		canClockIn,
		isProcessing,
		onClockIn: handleClockIn,
	};
}
