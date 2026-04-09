'use client';

import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogContent } from '@/components/ui/dialog';
import { DICT } from '@/dictionary';
import { PropertyDetailView } from '@/features/properties/components/PropertyDetailView';
import { PropertyForm } from '@/features/properties/components/PropertyForm';
import { PropertyManagementGrid } from '@/features/properties/components/PropertyManagementGrid';
import { ManagementLayout } from '@/layouts/ManagementLayout';
import { useHostProperties } from '@/features/properties/useHostProperties';

export function HostPropertiesPage() {
	const {
		properties,
		isLoading,
		viewingProperty,
		editingProperty,
		modal,
		handleUpsert,
		handleDelete,
	} = useHostProperties();

	return (
		<ManagementLayout
			title={DICT.PROPERTIES.TITLE}
			description={DICT.PROPERTIES.MESSAGE}
			headerActions={
				<Button onClick={modal.openCreate} size="lg">
					<Plus className="size-5" />
					<span>{DICT.PROPERTIES.NEW}</span>
				</Button>
			}
			isLoading={isLoading}
			loadingMessage="Loading properties..."
			hasResources={properties.length > 0}
			emptyState={
				<div className="flex flex-col items-center justify-center min-h-100 border-2 border-dashed rounded-xl p-8 text-center">
					<div className="bg-muted rounded-full p-4 mb-4">
						<Building2 className="size-8 text-muted-foreground" />
					</div>
					<h3 className="text-lg font-semibold">No properties found</h3>
					<p className="text-muted-foreground mb-6">Get started by adding your first property.</p>
				</div>
			}
			grid={
				<PropertyManagementGrid
					onView={modal.openView}
					onEdit={modal.openEdit}
					onDelete={modal.setDeletingId}
				/>
			}
			isViewOpen={modal.isViewOpen}
			isEditOrCreateOpen={modal.isEditOrCreateOpen}
			onClose={modal.handleClose}
			viewContent={
				viewingProperty ? (
					<PropertyDetailView
						property={viewingProperty}
						onEdit={modal.openEdit}
						onDelete={modal.setDeletingId}
					/>
				) : (
					<DialogContent>
						<div className="p-6 text-center">{DICT.PROPERTIES.NOT_FOUND}</div>
					</DialogContent>
				)
			}
			formTitle={
				editingProperty ? DICT.PROPERTIES.EDIT_DIALOG.TITLE : DICT.PROPERTIES.CREATE_DIALOG.TITLE
			}
			formDescription={
				editingProperty
					? DICT.PROPERTIES.EDIT_DIALOG.MESSAGE
					: DICT.PROPERTIES.CREATE_DIALOG.MESSAGE
			}
			formContent={
				<PropertyForm
					initialData={editingProperty}
					onSubmit={handleUpsert}
					onCancel={modal.handleClose}
				/>
			}
			deletingId={modal.deletingId}
			onDeleteCancel={() => modal.setDeletingId(null)}
			onDeleteConfirm={handleDelete}
			deleteTitle={DICT.PROPERTIES.DELETE_DIALOG.TITLE}
			deleteMessage={DICT.PROPERTIES.DELETE_DIALOG.MESSAGE}
		/>
	);
}