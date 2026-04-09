import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

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
