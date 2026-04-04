'use client';

import { CalendarX, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
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
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormContainer } from '@/components/ui/form-container';
import { DICT } from '@/dictionary';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import { CleaningDetailView } from '@/features/cleanings/components/CleaningDetailView';
import {
	CleaningForm,
	type CleaningFormValues,
} from '@/features/cleanings/components/CleaningForm';
import { CleaningManagementGrid } from '@/features/cleanings/components/CleaningManagementGrid';
import { useProperties } from '@/features/properties/PropertyContext';
import type { Property } from '@/features/properties/propertyService';

export function HostCleaningsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const { properties } = useProperties();
	const { cleanings, createCleaning, updateCleaning, deleteCleaning, isLoading } = useCleanings();
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const viewId = searchParams.get('view_cleaning');
	const editId = searchParams.get('edit_cleaning');
	const isCreating = searchParams.has('create_cleaning');

	const viewingCleaning = cleanings.find((c) => c.id === viewId);
	const editingCleaning = cleanings.find((c) => c.id === editId);

	const isViewOpen = !!viewId;
	const isEditOrCreateOpen = !!editId || isCreating;

	const handleClose = () => {
		const params = new URLSearchParams(searchParams);
		params.delete('view_cleaning');
		params.delete('edit_cleaning');
		params.delete('create_cleaning');
		setSearchParams(params);
	};

	const openEdit = (id: string) => {
		const params = new URLSearchParams(searchParams);
		params.delete('view_cleaning');
		params.set('edit_cleaning', id);
		setSearchParams(params);
	};

	const openView = (id: string) => {
		const params = new URLSearchParams(searchParams);
		params.set('view_cleaning', id);
		setSearchParams(params);
	};

	console.log(
		'[HostCleaningsPage] Render - isLoading:',
		isLoading,
		'cleaningsCount:',
		cleanings.length,
	);

	return (
		<main className="max-width-container">
			<PageHeader
				title={DICT.CLEANINGS.TITLE}
				description={DICT.CLEANINGS.MESSAGE}
				actions={
					<Button onClick={() => setSearchParams({ create_cleaning: 'true' })} size="lg">
						<Plus className="size-5" />
						<span>{DICT.CLEANINGS.NEW}</span>
					</Button>
				}
			/>

			<section className="mt-12">
				{isLoading ? (
					<div className="flex flex-col items-center justify-center min-h-100 space-y-4">
						<Loader2 className="size-8 animate-spin text-primary" />
						<p className="text-muted-foreground animate-pulse">Fetching scheduled cleanings...</p>
					</div>
				) : cleanings.length > 0 ? (
					<CleaningManagementGrid onView={openView} onEdit={openEdit} onDelete={setDeletingId} />
				) : (
					<div className="flex flex-col items-center justify-center min-h-100 border-2 border-dashed rounded-xl p-8 text-center">
						<div className="bg-muted rounded-full p-4 mb-4">
							<CalendarX className="size-8 text-muted-foreground" />
						</div>
						<h3 className="text-lg font-semibold">No cleanings scheduled</h3>
						<p className="text-muted-foreground mb-6">
							You haven't booked any cleaning services yet.
						</p>
					</div>
				)}
			</section>

			<Dialog open={isViewOpen} onOpenChange={(open) => !open && handleClose()}>
				{viewingCleaning ? (
					<CleaningDetailView
						cleaning={viewingCleaning}
						onEdit={openEdit}
						onDelete={setDeletingId}
					/>
				) : (
					<DialogContent>
						<div className="p-6 text-center text-muted-foreground">{DICT.CLEANINGS.NOT_FOUND}</div>
					</DialogContent>
				)}
			</Dialog>

			<Dialog open={isEditOrCreateOpen} onOpenChange={(open) => !open && handleClose()}>
				<DialogContent className="p-0 overflow-hidden max-w-2xl border-none">
					<FormContainer
						variant="dialog"
						title={
							editingCleaning
								? DICT.CLEANINGS.EDIT_DIALOG.TITLE
								: DICT.CLEANINGS.CREATE_DIALOG.TITLE
						}
						description={
							editingCleaning
								? DICT.CLEANINGS.EDIT_DIALOG.MESSAGE
								: DICT.CLEANINGS.CREATE_DIALOG.MESSAGE
						}>
						<CleaningForm
							initialData={editingCleaning}
							onSubmit={async (data: CleaningFormValues) => {
								try {
									let success = false;

									const scheduled_start = new Date(data.scheduled_start).toISOString();
									const custom_tasks = data.custom_tasks.map((t) => t.description);
									const instructions = data.instructions ?? '';

									if (editingCleaning) {
										success = await updateCleaning(editingCleaning.id, {
											scheduled_start,
											instructions,
											custom_tasks,
										});
									} else {
										const property = properties.find((p: Property) => p.id === data.property_id);
										const service_cost = property
											? 50 + property.bedrooms * 20 + property.bathrooms * 10
											: 0;

										success = await createCleaning({
											property_id: data.property_id,
											scheduled_start,
											custom_tasks,
											service_cost,
										});
									}

									if (success) {
										handleClose();
									}
								} catch (e) {
									console.error('Form submission failed', e);
								}
							}}
							onCancel={handleClose}
						/>
					</FormContainer>
				</DialogContent>
			</Dialog>

			<AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{DICT.CLEANINGS.DELETE_DIALOG.TITLE}</AlertDialogTitle>
						<AlertDialogDescription>{DICT.CLEANINGS.DELETE_DIALOG.MESSAGE}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{DICT.COMMON.BACK}</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-white hover:bg-destructive/90"
							onClick={async () => {
								if (deletingId) {
									await deleteCleaning(deletingId);
									setDeletingId(null);
									if (viewId === deletingId) {
										handleClose();
									}
								}
							}}>
							{DICT.COMMON.CANCEL}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</main>
	);
}
