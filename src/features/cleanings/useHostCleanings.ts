'use client';

import { useCallback, useMemo } from 'react';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import type { CleaningFormValues } from '@/features/cleanings/components/CleaningForm';
import { useResourceModals } from '@/hooks/useResourceModals';

export function useHostCleanings() {
	const { cleanings, upsertCleaning, deleteCleaning, isLoading } = useCleanings();
	const modal = useResourceModals({ resourceName: 'cleaning' });

	const viewingCleaning = useMemo(() => {
		return cleanings.find((c) => c.id === modal.viewId);
	}, [cleanings, modal.viewId]);

	const editingCleaning = useMemo(() => {
		return cleanings.find((c) => c.id === modal.editId);
	}, [cleanings, modal.editId]);

	const handleUpsert = useCallback(
		async (data: CleaningFormValues) => {
			const payload = {
				...(editingCleaning ? { id: editingCleaning.id } : {}),
				property_id: data.property_id,
				scheduled_start: new Date(data.scheduled_start).toISOString(),
				information: data.information ?? '',
				custom_tasks: data.custom_tasks.map((t) => t.description),
			};

			const result = await upsertCleaning(payload);
			if (result.success) {
				modal.handleClose();
			}
		},
		[editingCleaning, upsertCleaning, modal],
	);

	const handleDelete = useCallback(async () => {
		if (modal.deletingId) {
			const result = await deleteCleaning(modal.deletingId);
			if (result.success) {
				if (modal.viewId === modal.deletingId) {
					modal.handleClose();
				}
				modal.setDeletingId(null);
			}
		}
	}, [deleteCleaning, modal]);

	return {
		cleanings,
		isLoading,
		viewingCleaning,
		editingCleaning,
		modal,
		handleUpsert,
		handleDelete,
	};
}
