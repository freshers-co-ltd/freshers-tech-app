'use client';

import { useCallback, useMemo } from 'react';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import { calculateServiceCost } from '@/features/cleanings/cleaningService';
import type { HostCleaningFormValues } from '@/features/cleanings/components/HostCleaningForm';
import { useProperties } from '@/features/properties/PropertyContext';
import { useResourceModals } from '@/hooks/useResourceModals';

export function useHostCleanings() {
	const { properties } = useProperties();
	const { cleanings, upsertCleaning, deleteCleaning, isLoading } = useCleanings();
	const modal = useResourceModals('cleaning');

	const viewingCleaning = useMemo(() => {
		return cleanings.find((c) => c.id === modal.viewId);
	}, [cleanings, modal.viewId]);

	const editingCleaning = useMemo(() => {
		return cleanings.find((c) => c.id === modal.editId);
	}, [cleanings, modal.editId]);

	const handleUpsert = useCallback(
		async (data: HostCleaningFormValues) => {
			const property = properties.find((p) => p.id === data.property_id);
			const serviceCost = property
				? calculateServiceCost(property.bedrooms, property.bathrooms)
				: 0;

			const payload = {
				...(editingCleaning ? { id: editingCleaning.id } : {}),
				property_id: data.property_id,
				scheduled_start: new Date(data.scheduled_start).toISOString(),
				instructions: data.instructions ?? '',
				custom_tasks: data.custom_tasks.map((t) => t.description),
				service_cost: serviceCost,
			};

			const result = await upsertCleaning(payload);
			if (result.success) {
				modal.handleClose();
			}
		},
		[editingCleaning, upsertCleaning, modal, properties],
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
