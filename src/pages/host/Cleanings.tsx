'use client';

import { CalendarX, Plus } from 'lucide-react';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { Button } from '@/components/ui/button';
import { DICT } from '@/dictionary';
import { CleaningDetailView } from '@/features/cleanings/components/CleaningDetailView';
import { CleaningForm } from '@/features/cleanings/components/CleaningForm';
import { CleaningGrid } from '@/features/cleanings/components/CleaningGrid';
import { useHostCleanings } from '@/features/cleanings/hooks/useHostCleanings';
import { CLEANING_STATUS } from '@/features/cleanings/types';
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
		handleVerify,
		isDeleting,
		pendingFormValues,
		confirmCreate,
		cancelCreate,
	} = useHostCleanings();

	const deletingCleaning = cleanings.find((c) => c.id === modal.deletingId);
	const isUnverifiedDelete = deletingCleaning?.status === CLEANING_STATUS.UNVERIFIED;

	return (
		<>
			<ManagementLayout
				title={DICT.CLEANINGS.TITLE}
				headerActions={
					<Button onClick={modal.openCreate}>
						<Plus className="size-5" />
						<span>{DICT.CLEANINGS.NEW}</span>
					</Button>
				}
				isLoading={isLoading}
				hasResources={cleanings.length > 0}
				emptyState={
					<div className="flex flex-col items-center justify-center min-h-100 border-2 border-dashed rounded-xl p-8 text-center">
						<div className="bg-muted rounded-full p-4 mb-4">
							<CalendarX className="size-8 text-muted-foreground" />
						</div>
						<h3 className="text-lg font-semibold">{DICT.CLEANINGS.EMPTY.MESSAGE_HOST}</h3>
					</div>
				}
				grid={
					<CleaningGrid
						onView={modal.openView}
						onEdit={modal.openEdit}
						onDelete={modal.setDeletingId}
						userRole="host"
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
							onEdit={modal.openEdit}
							onDelete={modal.setDeletingId}
							onVerify={handleVerify}
						/>
					) : (
						<div className="p-6 text-center text-muted-foreground">{DICT.CLEANINGS.NOT_FOUND}</div>
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
				isDeleting={isDeleting}
				deleteTitle={isUnverifiedDelete ? DICT.CLEANINGS.REJECT.TITLE : DICT.CLEANINGS.DELETE.TITLE}
				deleteMessage={
					isUnverifiedDelete ? DICT.CLEANINGS.REJECT.MESSAGE : DICT.CLEANINGS.DELETE.MESSAGE
				}
			/>

			{pendingFormValues && (
				<ConfirmActionDialog
					open={true}
					onOpenChange={(open) => {
						if (!open) {
							cancelCreate();
						}
					}}
					title={DICT.CLEANINGS.CONFLICT.TITLE}
					description={DICT.CLEANINGS.CONFLICT.DESCRIPTION.replace(
						'{date}',
						new Date(pendingFormValues.scheduled_start).toLocaleDateString(),
					)}
					confirmText={DICT.CLEANINGS.CONFLICT.CONFIRM}
					onConfirm={confirmCreate}
				/>
			)}
		</>
	);
}
