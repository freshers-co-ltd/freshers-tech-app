'use client';

import { Loading } from '@/components/Loading';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormContainer } from '@/components/ui/form-container';
import { DICT } from '@/dictionary';
import type { UserRole } from '@/features/auth/types';
import { CleaningDetailView } from '@/features/cleanings/components/CleaningDetailView';
import {
	CleaningForm,
	type CleaningFormValues,
} from '@/features/cleanings/components/CleaningForm';
import type { CleaningRequest } from '@/features/cleanings/types';

interface CleaningDialogsProps {
	isViewOpen: boolean;
	isEditOpen: boolean;
	viewingCleaning: CleaningRequest | null;
	editingCleaning: CleaningRequest | null;
	isViewLoading: boolean;
	isEditLoading: boolean;
	deletingId: string | null;
	onDeleteConfirm: () => void;
	onDeleteCancel: () => void;
	onUpsert: (data: CleaningFormValues, existingId?: string) => Promise<void>;
	onCancel: () => void;
	onEdit?: (id: string) => void;
	onDelete?: (id: string) => void;
	userRole: UserRole;
}

export function CleaningDialogs({
	isViewOpen,
	isEditOpen,
	viewingCleaning,
	editingCleaning,
	isViewLoading,
	isEditLoading,
	deletingId,
	onDeleteConfirm,
	onDeleteCancel,
	onUpsert,
	onCancel,
	onEdit,
	onDelete,
	userRole,
}: CleaningDialogsProps) {
	return (
		<>
			<Dialog open={isViewOpen && !isEditOpen} onOpenChange={(open) => !open && onCancel()}>
				<DialogContent className="max-w-xl! w-screen sm:w-full h-[95svh] flex flex-col p-0 gap-0 overflow-hidden">
					{isViewLoading ? (
						<Loading />
					) : viewingCleaning ? (
						<CleaningDetailView
							cleaning={viewingCleaning}
							userRole={userRole}
							onEdit={onEdit}
							onDelete={onDelete}
						/>
					) : null}
				</DialogContent>
			</Dialog>

			<Dialog
				open={isEditOpen && editingCleaning !== null}
				onOpenChange={(open) => !open && onCancel()}>
				<DialogContent className="p-0 overflow-hidden max-w-2xl border-none">
					{isEditLoading ? (
						<Loading absolute={false} />
					) : editingCleaning ? (
						<FormContainer
							variant="dialog"
							title={DICT.CLEANINGS.EDIT.TITLE}
							description={DICT.CLEANINGS.EDIT.MESSAGE}>
							<CleaningForm
								initialData={editingCleaning}
								onSubmit={onUpsert}
								onCancel={onCancel}
								disableCreateProperty={true}
							/>
						</FormContainer>
					) : null}
				</DialogContent>
			</Dialog>

			<AlertDialog open={!!deletingId} onOpenChange={(open) => !open && onDeleteCancel()}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{DICT.COMMON.DIALOGS.DELETE_CLEANING.TITLE}</AlertDialogTitle>
						<AlertDialogDescription>
							{DICT.COMMON.DIALOGS.DELETE_CLEANING.MESSAGE}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{DICT.COMMON.ACTIONS.BACK}</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-white hover:bg-destructive/90"
							onClick={onDeleteConfirm}>
							{DICT.COMMON.ACTIONS.DELETE}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
