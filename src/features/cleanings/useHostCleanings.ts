'use client';

import { useMemo, useCallback } from 'react';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import { useProperties } from '@/features/properties/PropertyContext';
import { useResourceModals } from '@/hooks/useResourceModals';
import type { CleaningFormValues } from '@/features/cleanings/components/CleaningForm';

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

	const calculateServiceCost = useCallback((propertyId: string) => {
		const property = properties.find((p) => p.id === propertyId);
		if (!property) {
			return 0;
		}
		return 50 + property.bedrooms * 20 + property.bathrooms * 10;
	}, [properties]);

	const handleUpsert = useCallback(async (data: CleaningFormValues) => {
		const service_cost = calculateServiceCost(data.property_id);
		
		const payload = {
			...(editingCleaning ? { id: editingCleaning.id } : {}),
			property_id: data.property_id,
			scheduled_start: new Date(data.scheduled_start).toISOString(),
			instructions: data.instructions ?? '',
			custom_tasks: data.custom_tasks.map((t) => t.description),
			service_cost,
		};

		const result = await upsertCleaning(payload);
		if (result.success) {
			modal.handleClose();
		}
	}, [editingCleaning, upsertCleaning, modal, calculateServiceCost]);

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