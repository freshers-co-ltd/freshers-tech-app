'use client';

import { useMemo, useCallback } from 'react';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import { useAuth } from '@/features/auth/AuthContext';
import { useResourceModals } from '@/hooks/useResourceModals';
import { CLEANING_STATUS } from '@/features/cleanings/cleaningService';

export function useCleanerCleanings() {
	const { user } = useAuth();
	const { cleanings, updateCleaning, isLoading } = useCleanings();
	const modal = useResourceModals('cleaning');

	const cleanerCleanings = useMemo(() => 
		cleanings.filter((c) => c.cleaner_id === user?.id), 
	[cleanings, user?.id]);

	const viewingCleaning = useMemo(() => 
		cleanerCleanings.find((c) => c.id === modal.viewId), 
	[cleanerCleanings, modal.viewId]);

	const activeCleaning = useMemo(() => 
		cleanerCleanings.find((c) => c.status === CLEANING_STATUS.IN_PROGRESS), 
	[cleanerCleanings]);

	const handleClockIn = useCallback(async (cleaningId: string) => {
		const result = await updateCleaning(cleaningId, {
			clock_in_time: new Date().toISOString(),
		});
		return result;
	}, [updateCleaning]);

	const handleClockOut = useCallback(async (cleaningId: string) => {
		const result = await updateCleaning(cleaningId, {
			clock_out_time: new Date().toISOString(),
		});
		return result;
	}, [updateCleaning]);

	return {
		cleanings: cleanerCleanings,
		isLoading,
		viewingCleaning,
		activeCleaning,
		modal,
		handleClockIn,
		handleClockOut,
	};
}