'use client';

import { useMemo, useCallback } from 'react';
import { useProperties } from '@/features/properties/PropertyContext';
import { useAuth } from '@/features/auth/AuthContext';
import { useResourceModals } from '@/hooks/useResourceModals';
import type { PropertyFormValues } from '@/features/properties/components/PropertyForm';
import type { PropertyInsert } from '@/features/properties/propertyService';
import { useCleanings } from '@/features/cleanings/CleaningContext';

export function useHostProperties() {
	const { user } = useAuth();
	const { properties, upsertProperty, deleteProperty, isLoading } = useProperties();
	const { fetchCleanings } = useCleanings();
	const modal = useResourceModals('property');

	const viewingProperty = useMemo(() => {
		return properties.find((p) => p.id === modal.viewId);
	}, [properties, modal.viewId]);

	const editingProperty = useMemo(() => {
		return properties.find((p) => p.id === modal.editId);
	}, [properties, modal.editId]);

	const handleUpsert = useCallback(
		async (data: PropertyFormValues | PropertyInsert) => {
			if (!user) {
				return;
			}

			const payload: PropertyInsert = {
				...(editingProperty
					? {
							id: editingProperty.id,
							created_at: editingProperty.created_at,
						}
					: {}),
				host_id: user.id,
				address_line_1: data.address_line_1,
				address_line_2: data.address_line_2 ?? null,
				town_city: 'town_city' in data ? data.town_city : '',
				postcode: 'postcode' in data ? data.postcode : '',
				type: 'type' in data ? data.type : 'other',
				bedrooms: data.bedrooms ?? 0,
				bathrooms: data.bathrooms ?? 0,
				main_image_url: data.main_image_url ?? '',
				extra_images_urls: 'extra_images_urls' in data ? data.extra_images_urls : [],
				updated_at: new Date().toISOString(),
			};

			const result = await upsertProperty(payload);

			if (result.success) {
				await fetchCleanings();
				modal.handleClose();
			}
		},
		[user, editingProperty, upsertProperty, modal, fetchCleanings],
	);

	const handleDelete = useCallback(async () => {
		if (modal.deletingId) {
			const result = await deleteProperty(modal.deletingId);
			if (result.success) {
				await fetchCleanings();

				if (modal.viewId === modal.deletingId) {
					modal.handleClose();
				}
				modal.setDeletingId(null);
			}
		}
	}, [deleteProperty, modal, fetchCleanings]);

	return {
		properties,
		isLoading,
		viewingProperty,
		editingProperty,
		modal,
		handleUpsert,
		handleDelete,
	};
}
