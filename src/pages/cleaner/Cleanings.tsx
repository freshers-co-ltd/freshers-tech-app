'use client';

import { CalendarX } from 'lucide-react';
import { DialogContent } from '@/components/ui/dialog';
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
			loadingMessage="Fetching assigned cleanings..."
			hasResources={cleanings.length > 0}
			emptyState={
				<div className="flex flex-col items-center justify-center min-h-100 border-2 border-dashed rounded-xl p-8 text-center">
					<div className="bg-muted rounded-full p-4 mb-4">
						<CalendarX className="size-8 text-muted-foreground" />
					</div>
					<h3 className="text-lg font-semibold">No jobs assigned</h3>
					<p className="text-muted-foreground mb-6">
						You don't have any cleaning jobs assigned to you yet.
					</p>
				</div>
			}
			grid={<CleanerCleaningGrid onView={modal.openView} />}
			isViewOpen={modal.isViewOpen}
			isEditOrCreateOpen={false}
			onClose={modal.handleClose}
			viewContent={
				viewingCleaning ? (
					<CleaningDetailView
						cleaning={viewingCleaning}
						userRole="cleaner"
						open={modal.isViewOpen}
						onOpenChange={modal.handleClose}
					/>
				) : (
					<DialogContent>
						<div className="p-6 text-center text-muted-foreground">{DICT.CLEANINGS.NOT_FOUND}</div>
					</DialogContent>
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
