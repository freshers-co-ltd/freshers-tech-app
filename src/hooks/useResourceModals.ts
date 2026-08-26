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

	// Defer the following URL state updates to the next task so the currently
	// open Dialog begins its Radix exit animation before another Dialog mounts.
	// Updating both in the same batch mounts two Dialogs simultaneously, which
	// breaks Radix focus/scroll handling and can prevent the next Dialog opening.
	const handleClose = () => {
		setEditId(null);
		setTimeout(() => {
			setViewId(null);
			setCreate(null);
		}, 0);
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
