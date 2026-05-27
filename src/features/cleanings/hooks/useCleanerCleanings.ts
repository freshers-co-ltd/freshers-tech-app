'use client';

import { useCallback, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import { CLEANING_STATUS } from '@/features/cleanings/types';
import { useResourceModals } from '@/hooks/useResourceModals';

export function useCleanerCleanings() {
	const { user } = useAuth();
	const {
		cleanings,
		isLoading,
		updateCleaning,
		insertTask,
		updateTask,
		addEvidence,
		deleteEvidence,
		upsertReport,
	} = useCleanings();
	const modal = useResourceModals({ resourceName: 'cleaning' });
	const viewingCleaning = useMemo(
		() => cleanings.find((c) => c.id === modal.viewId),
		[cleanings, modal.viewId],
	);

	const cleanerCleanings = useMemo(
		() => cleanings.filter((c) => c.cleaner_id === user?.id),
		[cleanings, user?.id],
	);

	const activeCleaning = useMemo(
		() => cleanerCleanings.find((c) => c.status === CLEANING_STATUS.IN_PROGRESS),
		[cleanerCleanings],
	);

	const handleClockIn = useCallback(
		async (cleaningId: string) => {
			const result = await updateCleaning(cleaningId, {
				clock_in_time: new Date().toISOString(),
			});
			return result;
		},
		[updateCleaning],
	);

	const handleClockOut = useCallback(
		async (cleaningId: string) => {
			const result = await updateCleaning(cleaningId, {
				clock_out_time: new Date().toISOString(),
			});
			return result;
		},
		[updateCleaning],
	);

	return {
		cleanings: cleanerCleanings,
		isLoading,
		viewingCleaning,
		activeCleaning,
		modal,
		handleClockIn,
		handleClockOut,
		insertTask,
		updateTask,
		addEvidence,
		deleteEvidence,
		upsertReport,
	};
}
