'use client';

import { CalendarX, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogContent } from '@/components/ui/dialog';
import { DICT } from '@/dictionary';
import { CleaningDetailView } from '@/features/cleanings/components/CleaningDetailView';
import { CleaningForm } from '@/features/cleanings/components/CleaningForm';
import { HostCleaningGrid } from '@/features/cleanings/components/HostCleaningGrid';
import { useHostCleanings } from '@/features/cleanings/useHostCleanings';
import { ManagementLayout } from '@/layouts/ManagementLayout';

export function HostCleaningsPage() {
	const {
		cleanings,
		isLoading,
		viewingCleaning,
		editingCleaning,
		modal,
		handleUpsert,
		handleDelete,
	} = useHostCleanings();

	return (
		<ManagementLayout
			title={DICT.CLEANINGS.TITLE}
			headerActions={
				<Button onClick={modal.openCreate}>
					<Plus className="size-5" />
					<span>{DICT.CLEANINGS.NEW}</span>
				</Button>
			}
			isLoading={isLoading}
			loadingMessage="Fetching scheduled cleanings..."
			hasResources={cleanings.length > 0}
			emptyState={
				<div className="flex flex-col items-center justify-center min-h-100 border-2 border-dashed rounded-xl p-8 text-center">
					<div className="bg-muted rounded-full p-4 mb-4">
						<CalendarX className="size-8 text-muted-foreground" />
					</div>
					<h3 className="text-lg font-semibold">{DICT.CLEANINGS.EMPTY.TITLE}</h3>
					<p className="text-muted-foreground mb-6">{DICT.CLEANINGS.EMPTY.MESSAGE}</p>
				</div>
			}
			grid={
				<HostCleaningGrid
					onView={modal.openView}
					onEdit={modal.openEdit}
					onDelete={modal.setDeletingId}
				/>
			}
			isViewOpen={modal.isViewOpen}
			isEditOrCreateOpen={modal.isEditOrCreateOpen}
			onClose={modal.handleClose}
			viewContent={
				viewingCleaning ? (
					<CleaningDetailView
						cleaning={viewingCleaning}
						userRole="host"
						open={modal.isViewOpen}
						onOpenChange={modal.handleClose}
						onEdit={modal.openEdit}
						onDelete={modal.setDeletingId}
					/>
				) : (
					<DialogContent>
						<div className="p-6 text-center text-muted-foreground">{DICT.CLEANINGS.NOT_FOUND}</div>
					</DialogContent>
				)
			}
			formTitle={editingCleaning ? DICT.CLEANINGS.EDIT.TITLE : DICT.CLEANINGS.CREATE.TITLE}
			formDescription={
				editingCleaning ? DICT.CLEANINGS.EDIT.MESSAGE : DICT.CLEANINGS.CREATE.MESSAGE
			}
			formContent={
				<CleaningForm
					initialData={editingCleaning}
					onSubmit={handleUpsert}
					onCancel={modal.handleClose}
				/>
			}
			deletingId={modal.deletingId}
			onDeleteCancel={() => modal.setDeletingId(null)}
			onDeleteConfirm={handleDelete}
			deleteTitle={DICT.COMMON.DIALOGS.DELETE_CLEANING.TITLE}
			deleteMessage={DICT.COMMON.DIALOGS.DELETE_CLEANING.MESSAGE}
		/>
	);
}
