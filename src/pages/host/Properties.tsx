'use client';

import { Building2, Loader2, Plus } from 'lucide-react';
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
import { PropertyDetailView } from '@/features/properties/components/PropertyDetailView';
import { PropertyForm } from '@/features/properties/components/PropertyForm';
import { PropertyManagementGrid } from '@/features/properties/components/PropertyManagementGrid';
import { useProperties } from '@/features/properties/PropertyContext';

export function HostPropertiesPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const { properties, upsertProperty, deleteProperty, isLoading } = useProperties();
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const viewId = searchParams.get('view_property');
	const editId = searchParams.get('edit_property');
	const isCreating = searchParams.has('create_property');

	const viewingProperty = properties.find((p) => p.id === viewId);
	const editingProperty = properties.find((p) => p.id === editId);

	const isViewOpen = !!viewId;
	const isEditOrCreateOpen = !!editId || isCreating;

	const handleClose = () => {
		const params = new URLSearchParams(searchParams);
		params.delete('view_property');
		params.delete('edit_property');
		params.delete('create_property');
		setSearchParams(params);
	};

	const openEdit = (id: string) => {
		const params = new URLSearchParams(searchParams);
		params.delete('view_property');
		params.set('edit_property', id);
		setSearchParams(params);
	};

	const openView = (id: string) => {
		const params = new URLSearchParams(searchParams);
		params.set('view_property', id);
		setSearchParams(params);
	};

	console.log(
		'[HostPropertiesPage] Render - isLoading:',
		isLoading,
		'propertiesCount:',
		properties.length,
	);

	return (
		<main className="max-width-container">
			<PageHeader
				title={DICT.PROPERTIES.TITLE}
				description={DICT.PROPERTIES.MESSAGE}
				actions={
					<Button onClick={() => setSearchParams({ create_property: 'true' })} size="lg">
						<Plus className="size-5" />
						<span>{DICT.PROPERTIES.NEW}</span>
					</Button>
				}
			/>

			<section className="mt-12">
				{isLoading ? (
					<div className="flex flex-col items-center justify-center min-h-100 space-y-4">
						<Loader2 className="size-8 animate-spin text-primary" />
						<p className="text-muted-foreground animate-pulse">Loading properties...</p>
					</div>
				) : properties.length > 0 ? (
					<PropertyManagementGrid onView={openView} onEdit={openEdit} onDelete={setDeletingId} />
				) : (
					<div className="flex flex-col items-center justify-center min-h-100 border-2 border-dashed rounded-xl p-8 text-center">
						<div className="bg-muted rounded-full p-4 mb-4">
							<Building2 className="size-8 text-muted-foreground" />
						</div>
						<h3 className="text-lg font-semibold">No properties found</h3>
						<p className="text-muted-foreground mb-6">Get started by adding your first property.</p>
					</div>
				)}
			</section>

			<Dialog open={isViewOpen} onOpenChange={(open) => !open && handleClose()}>
				{viewingProperty ? (
					<PropertyDetailView
						property={viewingProperty}
						onEdit={openEdit}
						onDelete={setDeletingId}
					/>
				) : (
					<DialogContent>
						<div className="p-6 text-center">{DICT.PROPERTIES.NOT_FOUND}</div>
					</DialogContent>
				)}
			</Dialog>

			<Dialog open={isEditOrCreateOpen} onOpenChange={(open) => !open && handleClose()}>
				<DialogContent className="p-0 overflow-hidden max-w-2xl border-none">
					<FormContainer
						variant="dialog"
						title={
							editingProperty
								? DICT.PROPERTIES.EDIT_DIALOG.TITLE
								: DICT.PROPERTIES.CREATE_DIALOG.TITLE
						}
						description={
							editingProperty
								? DICT.PROPERTIES.EDIT_DIALOG.MESSAGE
								: DICT.PROPERTIES.CREATE_DIALOG.MESSAGE
						}>
						<PropertyForm
							initialData={editingProperty}
							onSubmit={async (data) => {
								const result = await upsertProperty(data);
								if (result.success) {
									handleClose();
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
						<AlertDialogTitle>{DICT.PROPERTIES.DELETE_DIALOG.TITLE}</AlertDialogTitle>
						<AlertDialogDescription>{DICT.PROPERTIES.DELETE_DIALOG.MESSAGE}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{DICT.COMMON.CANCEL}</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-white"
							onClick={async () => {
								if (deletingId) {
									await deleteProperty(deletingId);
									setDeletingId(null);
									if (viewId === deletingId) {
										handleClose();
									}
								}
							}}>
							{DICT.COMMON.DELETE}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</main>
	);
}
