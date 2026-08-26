'use client';

import { useCallback, useMemo, useState } from 'react';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import type { CleaningFormValues } from '@/features/cleanings/components/CleaningForm';
import { cleaningRequestService } from '@/features/cleanings/services/cleaningRequestService';
import { useResourceModals } from '@/hooks/useResourceModals';

export function useHostCleanings() {
	const { cleanings, isLoading, upsertCleaning, verifyCleaning, deleteCleaning } = useCleanings();
	const modal = useResourceModals({ resourceName: 'cleaning' });
	const [pendingFormValues, setPendingFormValues] = useState<CleaningFormValues | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const viewingCleaning = useMemo(
		() => cleanings.find((c) => c.id === modal.viewId),
		[cleanings, modal.viewId],
	);

	const editingCleaning = useMemo(
		() => cleanings.find((c) => c.id === modal.editId),
		[cleanings, modal.editId],
	);

	const executeUpsert = useCallback(
		async (data: CleaningFormValues) => {
			const payload = {
				...(editingCleaning ? { id: editingCleaning.id } : {}),
				property_id: data.property_id,
				scheduled_start: new Date(data.scheduled_start).toISOString(),
				information: data.information ?? '',
				stocks_included: data.stocks_included,
				custom_tasks: data.custom_tasks.map((t) => t.description),
			};

			const result = await upsertCleaning(payload);
			if (result.success) {
				modal.handleClose();
			}
		},
		[editingCleaning, upsertCleaning, modal],
	);

	const handleUpsert = useCallback(
		async (data: CleaningFormValues) => {
			if (!editingCleaning) {
				const checkDate = data.scheduled_start.toISOString().slice(0, 10);
				const { data: conflicts } = await cleaningRequestService.checkPropertyCleaningConflict(
					data.property_id,
					checkDate,
				);
				if (conflicts && conflicts.length > 0) {
					setPendingFormValues(data);
					return;
				}
			}
			await executeUpsert(data);
		},
		[editingCleaning, executeUpsert],
	);

	const handleDelete = useCallback(async () => {
		if (modal.deletingId) {
			setIsDeleting(true);
			try {
				const deleting = cleanings.find((c) => c.id === modal.deletingId);
				const result = await deleteCleaning(modal.deletingId, false, deleting?.status);
				if (result.success) {
					if (modal.viewId === modal.deletingId) {
						modal.handleClose();
					}
					modal.setDeletingId(null);
				}
			} finally {
				setIsDeleting(false);
			}
		}
	}, [deleteCleaning, modal, cleanings]);

	const confirmCreate = useCallback(() => {
		if (pendingFormValues) {
			executeUpsert(pendingFormValues);
			setPendingFormValues(null);
		}
	}, [pendingFormValues, executeUpsert]);

	const cancelCreate = useCallback(() => {
		setPendingFormValues(null);
	}, []);

	const handleVerify = useCallback(
		async (id: string) => {
			const result = await verifyCleaning(id);
			if (result.success) {
				modal.handleClose();
			}
		},
		[verifyCleaning, modal],
	);

	return {
		cleanings,
		isLoading,
		viewingCleaning,
		editingCleaning,
		modal,
		handleUpsert,
		handleDelete,
		handleVerify,
		isDeleting,
		pendingFormValues,
		confirmCreate,
		cancelCreate,
	};
}
