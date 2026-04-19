import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Hook for managing modal state via URL search parameters.
 * Provides a unified interface for viewing, editing, and creating resources.
 * State is persisted in URL, allowing for bookmarking and browser navigation.
 *
 * @param resourceName - The type of resource (e.g., 'property', 'cleaning')
 * @returns Object containing modal state and handlers
 *
 * @example
 * ```typescript
 * const modal = useResourceModals('property');
 * modal.openView('123'); // Opens view modal for property 123
 * modal.openEdit('456'); // Opens edit modal for property 456
 * modal.openCreate();  // Opens create modal
 * modal.handleClose(); // Closes all modals
 * ```
 */
export function useResourceModals(resourceName: string) {
	const [searchParams, setSearchParams] = useSearchParams();
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const viewKey = `view_${resourceName}`;
	const editKey = `edit_${resourceName}`;
	const createKey = `create_${resourceName}`;

	const viewId = searchParams.get(viewKey);
	const editId = searchParams.get(editKey);
	const isCreating = searchParams.has(createKey);

	const handleClose = () => {
		const params = new URLSearchParams(searchParams);
		params.delete(viewKey);
		params.delete(editKey);
		params.delete(createKey);
		setSearchParams(params);
	};

	const openEdit = (id: string) => {
		const params = new URLSearchParams(searchParams);
		params.delete(viewKey);
		params.set(editKey, id);
		setSearchParams(params);
	};

	const openView = (id: string) => {
		const params = new URLSearchParams(searchParams);
		params.set(viewKey, id);
		setSearchParams(params);
	};

	const openCreate = () => {
		setSearchParams({ [createKey]: 'true' });
	};

	return {
		viewId,
		editId,
		isCreating,
		deletingId,
		setDeletingId,
		handleClose,
		openEdit,
		openView,
		openCreate,
		isViewOpen: !!viewId,
		isEditOrCreateOpen: !!editId || isCreating,
	};
}
