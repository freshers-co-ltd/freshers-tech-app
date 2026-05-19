'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/components/Toast';
import { DICT } from '@/dictionary';
import type { UserRole } from '@/features/auth/authService';
import type { CleaningRequest } from '@/features/cleanings/cleaningService';
import type { CleaningFormValues } from '@/features/cleanings/components/CleaningForm';
import { useResourceModals } from '@/hooks/useResourceModals';

interface UseCleaningModalsOptions {
	fetchById?: (id: string) => Promise<CleaningRequest | null>;
	cleanings?: CleaningRequest[];
	onUpsert?: (data: CleaningFormValues, existingId?: string) => Promise<void>;
	onDelete?: (id: string) => Promise<void>;
	userRole: UserRole;
}

interface UseCleaningModalsResult {
	modal: ReturnType<typeof useResourceModals>;
	viewingCleaning: CleaningRequest | null;
	editingCleaning: CleaningRequest | null;
	isViewLoading: boolean;
	isEditLoading: boolean;
	handleUpsert: (data: CleaningFormValues, existingId?: string) => Promise<void>;
	handleDelete: () => Promise<void>;
}

export function useCleaningModals({
	fetchById,
	cleanings,
	onUpsert,
	onDelete,
}: UseCleaningModalsOptions): UseCleaningModalsResult {
	const modal = useResourceModals({ resourceName: 'cleaning' });

	const [viewingCleaning, setViewingCleaning] = useState<CleaningRequest | null>(null);
	const [editingCleaning, setEditingCleaning] = useState<CleaningRequest | null>(null);
	const [isViewLoading, setIsViewLoading] = useState(false);
	const [isEditLoading, setIsEditLoading] = useState(false);

	const fetchCleaning = useCallback(
		async (id: string) => {
			if (fetchById) {
				return fetchById(id);
			}
			if (cleanings) {
				return cleanings.find((c) => c.id === id) || null;
			}
			return null;
		},
		[fetchById, cleanings],
	);

	useEffect(() => {
		if (!modal.viewId) {
			setViewingCleaning(null);
			return;
		}

		setIsViewLoading(true);
		fetchCleaning(modal.viewId)
			.then((data) => {
				setViewingCleaning(data);
			})
			.catch(() => {
				toast.error(DICT.COMMON.TOASTS.FAILED_TO_LOAD_CLEANING);
			})
			.finally(() => {
				setIsViewLoading(false);
			});
	}, [modal.viewId, fetchCleaning]);

	useEffect(() => {
		if (!modal.editId) {
			setEditingCleaning(null);
			return;
		}

		setIsEditLoading(true);
		fetchCleaning(modal.editId)
			.then((data) => {
				setEditingCleaning(data);
			})
			.catch(() => {
				toast.error(DICT.COMMON.TOASTS.FAILED_TO_LOAD_CLEANING_EDIT);
			})
			.finally(() => {
				setIsEditLoading(false);
			});
	}, [modal.editId, fetchCleaning]);

	const handleUpsert = useCallback(
		async (data: CleaningFormValues) => {
			if (!editingCleaning) {
				return;
			}

			if (onUpsert) {
				await onUpsert(data, editingCleaning.id);
			}
		},
		[editingCleaning, onUpsert],
	);

	const handleDelete = useCallback(async () => {
		if (!modal.deletingId) {
			return;
		}

		if (onDelete) {
			const result = onDelete(modal.deletingId);
			if (result) {
				await result;
				if (modal.viewId === modal.deletingId) {
					modal.handleClose();
				}
				modal.setDeletingId(null);
			}
		}
	}, [modal, onDelete]);

	return {
		modal,
		viewingCleaning,
		editingCleaning,
		isViewLoading,
		isEditLoading,
		handleUpsert,
		handleDelete,
	};
}
