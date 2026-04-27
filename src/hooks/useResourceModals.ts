'use client';

import { type UseQueryStateOptions, useQueryState } from 'nuqs';
import { useState } from 'react';

interface UseResourceModalsOptions {
	resourceName: string;
	options?: UseQueryStateOptions<string>;
}

export function useResourceModals(options: UseResourceModalsOptions) {
	const { resourceName } = options;

	const [viewId, setViewId] = useQueryState(`${resourceName}_view`, {
		defaultValue: '',
		shallow: false,
	});

	const [editId, setEditId] = useQueryState(`${resourceName}_edit`, {
		defaultValue: '',
		shallow: false,
	});

	const [create, setCreate] = useQueryState(`${resourceName}_create`, {
		defaultValue: '',
		shallow: false,
	});

	const [deletingId, setDeletingId] = useState<string | null>(null);

	const handleClose = () => {
		setViewId(null);
		setEditId(null);
		setCreate(null);
	};

	const openEdit = (id: string) => {
		setViewId(null);
		setEditId(id);
	};

	const openView = (id: string) => {
		setViewId(id);
	};

	const openCreate = () => {
		setCreate('true');
	};

	return {
		viewId: viewId || null,
		editId: editId || null,
		isCreating: create === 'true',
		deletingId,
		setDeletingId,
		handleClose,
		openEdit,
		openView,
		openCreate,
		isViewOpen: !!viewId,
		isEditOrCreateOpen: !!editId || create === 'true',
	};
}
