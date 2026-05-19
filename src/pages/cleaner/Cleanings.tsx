'use client';

import { CalendarX } from 'lucide-react';
import { DICT } from '@/dictionary';
import { CleanerCleaningGrid } from '@/features/cleanings/components/CleanerCleaningGrid';
import { CleaningDetailView } from '@/features/cleanings/components/CleaningDetailView';
import { useCleanerCleanings } from '@/features/cleanings/useCleanerCleanings';
import { ManagementLayout } from '@/layouts/ManagementLayout';

export function CleanerCleaningsPage() {
	const { cleanings, isLoading, viewingCleaning, modal } = useCleanerCleanings();

	return (
		<ManagementLayout
			title={DICT.CLEANINGS.TITLE}
			headerActions={null}
			isLoading={isLoading}
			hasResources={cleanings.length > 0}
			emptyState={
				<div className="flex flex-col items-center justify-center min-h-100 border-2 border-dashed rounded-xl p-8 text-center">
					<div className="bg-muted rounded-full p-4 mb-4">
						<CalendarX className="size-8 text-muted-foreground" />
					</div>
					<h3 className="text-lg font-semibold">{DICT.CLEANINGS.EMPTY.MESSAGE_CLEANER}</h3>
				</div>
			}
			grid={<CleanerCleaningGrid onView={modal.openView} />}
			isViewOpen={modal.isViewOpen}
			isEditOrCreateOpen={false}
			onClose={modal.handleClose}
			viewContent={
				viewingCleaning ? (
					<CleaningDetailView cleaning={viewingCleaning} userRole="cleaner" />
				) : (
					<div className="p-6 text-center text-muted-foreground">{DICT.CLEANINGS.NOT_FOUND}</div>
				)
			}
			formContent={null}
			formTitle=""
			formDescription=""
			deletingId={null}
			onDeleteCancel={() => {}}
			onDeleteConfirm={async () => {}}
			deleteTitle=""
			deleteMessage=""
		/>
	);
}
