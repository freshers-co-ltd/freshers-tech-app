'use client';

import { useCallback, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import type { PropertyFormValues } from '@/features/properties/components/PropertyForm';
import { useProperties } from '@/features/properties/PropertyContext';
import type { PropertyInsert } from '@/features/properties/types';
import { propertyTypeValues } from '@/features/properties/types';
import { useResourceModals } from '@/hooks/useResourceModals';

export function useHostProperties() {
	const { user } = useAuth();
	const { properties, upsertProperty, deleteProperty, isLoading } = useProperties();
	const { fetchCleanings } = useCleanings();
	const modal = useResourceModals({ resourceName: 'property' });

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
				type: 'type' in data ? data.type : propertyTypeValues[0],
				bedrooms: data.bedrooms ?? 0,
				bathrooms: data.bathrooms ?? 0,
				main_image_url: data.main_image_url ?? '',
				extra_images_urls: 'extra_images_urls' in data ? data.extra_images_urls : [],
				updated_at: new Date().toISOString(),
			};

			const result = await upsertProperty(payload);

			if (result.success) {
				modal.handleClose();
			}
		},
		[user, editingProperty, upsertProperty, modal],
	);

	const handleDelete = useCallback(async () => {
		if (modal.deletingId) {
			const result = await deleteProperty(modal.deletingId);
			if (result.success) {
				if (modal.viewId === modal.deletingId) {
					modal.handleClose();
				}
				modal.setDeletingId(null);
				await fetchCleanings();
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
