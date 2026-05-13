'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loading } from '@/components/Loading';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import type { CleaningRequest } from '@/features/cleanings/cleaningService';
import { cleaningService } from '@/features/cleanings/cleaningService';
import { CleaningDetailView } from '@/features/cleanings/components/CleaningDetailView';

export interface CleaningViewDialogProps {
	open: boolean;
	viewId: string | null;
	onClose: () => void;
}

export function CleaningViewDialog({ open, viewId, onClose }: CleaningViewDialogProps) {
	const [viewingCleaning, setViewingCleaning] = useState<CleaningRequest | null>(null);
	const [viewingLoading, setViewingLoading] = useState(false);

	const fetchViewingCleaning = useCallback(async () => {
		if (!viewId) {
			return;
		}
		setViewingLoading(true);
		const result = await cleaningService.getCleaningRequestById(viewId);
		if (!result.error && result.data) {
			setViewingCleaning(result.data);
		}
		setViewingLoading(false);
	}, [viewId]);

	useEffect(() => {
		if (open && viewId) {
			fetchViewingCleaning();
		} else {
			setViewingCleaning(null);
		}
	}, [open, viewId, fetchViewingCleaning]);

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
			<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Cleaning Details</DialogTitle>
					<DialogDescription>View complete cleaning information</DialogDescription>
				</DialogHeader>
				{viewingLoading ? (
					<Loading />
				) : viewingCleaning ? (
					<CleaningDetailView
						cleaning={viewingCleaning}
						userRole="admin"
						open={open}
						onOpenChange={(isOpen) => !isOpen && onClose()}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
