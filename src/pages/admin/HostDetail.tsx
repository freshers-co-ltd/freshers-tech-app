'use client';

import { BadgeCheck, BrushCleaning, CalendarClock, ClipboardList, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loading } from '@/components/Loading';
import { toast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { FormContainer } from '@/components/ui/form-container';
import { DICT } from '@/dictionary';
import { CleaningsTable } from '@/features/admin/components/CleaningsTable';
import { PropertiesTable } from '@/features/admin/components/PropertiesTable';
import { PropertyPriceDialog } from '@/features/admin/components/PropertyPriceDialog';
import { useAdminUsers } from '@/features/admin/hooks/useAdminUsers';
import { useHostDetail } from '@/features/admin/hooks/useHostDetail';
import { cleaningService as adminCleaningService } from '@/features/admin/services/cleaningService';
import { userService } from '@/features/admin/services/userService';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import type { CleaningFormValues } from '@/features/cleanings/components/CleaningForm';
import { CleaningForm } from '@/features/cleanings/components/CleaningForm';
import { cleaningsService } from '@/features/cleanings/services/cleaningsService';
import { PropertyDetailView } from '@/features/properties/components/PropertyDetailView';
import { propertyService } from '@/features/properties/propertyService';
import type { Property } from '@/features/properties/types';
import { useResourceModals } from '@/hooks/useResourceModals';
import { UserDetailLayout } from '@/layouts/UserDetailLayout';

export function AdminHostDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [editingProperty, setEditingProperty] = useState<Property | null>(null);
	const [propertiesSortField, setPropertiesSortField] = useState<string>('address_line_1');
	const [propertiesSortDirection, setPropertiesSortDirection] = useState<'asc' | 'desc'>('desc');

	const { host, loading, refresh } = useHostDetail(id, {
		propertiesSortField,
		propertiesSortDirection,
	});

	const { fetchCleanings } = useCleanings();

	const propertyModal = useResourceModals({ resourceName: 'property' });

	const { handleResetPassword, handleBan, handleUnban } = useAdminUsers();

	const [viewingProperty, setViewingProperty] = useState<Property | null>(null);
	const [viewingPropertyLoading, setViewingPropertyLoading] = useState(false);
	const [availableCleaners, setAvailableCleaners] = useState<
		{ id: string; full_name: string | null }[]
	>([]);

	useEffect(() => {
		userService.getAvailableCleaners().then((result) => {
			if (!result.error && result.data) {
				setAvailableCleaners(result.data);
			}
		});
	}, []);

	const dict = DICT.ADMIN.CLEANINGS.DETAIL.HOST_DETAIL;

	const fetchViewingProperty = useCallback(async () => {
		if (!propertyModal.viewId) {
			return;
		}
		setViewingPropertyLoading(true);
		const { data, error } = await propertyService.getPropertyById(propertyModal.viewId);
		if (!error && data) {
			setViewingProperty(data);
		}
		setViewingPropertyLoading(false);
	}, [propertyModal.viewId]);

	useEffect(() => {
		if (propertyModal.isViewOpen && propertyModal.viewId) {
			fetchViewingProperty();
		} else {
			setViewingProperty(null);
		}
	}, [propertyModal.isViewOpen, propertyModal.viewId, fetchViewingProperty]);

	const onResetPassword = useCallback(async () => {
		if (!host) {
			return { error: 'No user loaded' };
		}
		return handleResetPassword(host.id, refresh);
	}, [host, handleResetPassword, refresh]);

	const onBan = useCallback(async () => {
		if (!host) {
			return { error: 'No user loaded' };
		}
		return handleBan(host.id, refresh);
	}, [host, handleBan, refresh]);

	const onUnban = useCallback(async () => {
		if (!host) {
			return { error: 'No user loaded' };
		}
		return handleUnban(host.id, refresh);
	}, [host, handleUnban, refresh]);

	const onDeleteUser = useCallback(async () => {
		if (!host) {
			return { error: 'No user loaded' };
		}
		const result = await userService.purgeUserPii(host.id);
		if (result.error) {
			return { error: result.error };
		}
		navigate('/admin/users');
		return { error: null };
	}, [host, navigate]);

	const handleCreateCleaning = async (values: CleaningFormValues) => {
		if (!id) {
			return;
		}
		const result = await adminCleaningService.createCleaningForHost(
			id,
			values.property_id,
			values.scheduled_start.toISOString(),
			{
				information: values.information || undefined,
				stocksIncluded: values.stocks_included,
				customTasks: values.custom_tasks?.map((t) => t.description) || [],
			},
		);
		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success(DICT.CLEANINGS.CREATE.TOAST_SUCCESS);
			setIsCreateModalOpen(false);
			await Promise.all([refresh(), fetchCleanings()]);
		}
	};

	const fetchCleaningById = useCallback(async (cleaningId: string) => {
		const result = await cleaningsService.getCleaningRequestById(cleaningId);
		return result.data || null;
	}, []);

	const handleUpsert = useCallback(
		async (values: CleaningFormValues, existingId?: string) => {
			if (!existingId) {
				return;
			}
			const result = await adminCleaningService.updateCleaning(existingId, {
				information: values.information || '',
				scheduled_start: values.scheduled_start.toISOString(),
				stocks_included: values.stocks_included,
				custom_tasks: values.custom_tasks?.map((t) => t.description) || [],
			});
			if (result.error) {
				throw new Error(result.error);
			}
			await Promise.all([refresh(), fetchCleanings()]);
		},
		[refresh, fetchCleanings],
	);

	const refreshAll = useCallback(async () => {
		await Promise.all([refresh(), fetchCleanings()]);
	}, [refresh, fetchCleanings]);

	if (!host) {
		return null;
	}

	const properties = host.properties || [];
	const cleanings = host.cleanings || [];
	const stats = host.cleaning_stats;

	const tableData = cleanings.map((c) => {
		const property = properties.find((p) => p.id === c.property_id);
		return {
			id: c.id,
			status: c.status,
			scheduled_start: c.scheduled_start,
			service_cost: c.service_cost,
			cleaner_pay: c.cleaner_pay,
			cleaner_id: c.cleaner_id,
			cleaner_name: c.cleaner_name,
			host_id: host.id,
			host_name: host.full_name,
			property_id: c.property_id,
			property_address: property ? `${property.address_line_1}` : null,
			property_postcode: property ? property.postcode : null,
			property_town_city: property ? property.town_city : null,
			created_at: c.created_at,
			information: null,
			stocks_included: false,
			clock_in_time: null,
			clock_out_time: null,
			updated_at: c.created_at,
			deleted_at: null,
		};
	});

	const statsConfig = [
		{
			id: 'total-requested',
			label: dict.STATS.TOTAL_REQUESTED,
			value: stats?.total || 0,
			icon: ClipboardList,
			iconColor: 'text-[color-mix(in_oklch,var(--color-primary),var(--color-destructive))]',
		},
		{
			id: 'requested',
			label: dict.STATS.PENDING_REQUESTED,
			value: stats?.requested || 0,
			icon: CalendarClock,
			iconColor: 'text-warning',
		},
		{
			id: 'pending',
			label: dict.STATS.PENDING_CONFIRMED,
			value: stats?.confirmed || 0,
			icon: BadgeCheck,
			iconColor: 'text-success',
		},
		{
			id: 'in-progress',
			label: dict.STATS.IN_PROGRESS,
			value: stats?.in_progress || 0,
			icon: BrushCleaning,
			iconColor: 'text-primary-light',
		},
	];

	return (
		<UserDetailLayout
			user={host}
			userRole="host"
			isLoading={loading}
			onResetPassword={onResetPassword}
			onBan={onBan}
			onUnban={onUnban}
			onDeleteUser={onDeleteUser}
			stats={statsConfig}
			sections={[
				{
					title: dict.PROPERTIES_TITLE,
					content: (
						<PropertiesTable
							data={properties}
							emptyMessage={dict.EMPTY_PROPERTIES}
							onView={(id) => propertyModal.openView(id)}
							onEditPrice={(property) => setEditingProperty(property)}
							pageSize={10}
							totalCount={properties.length}
							sortField={propertiesSortField}
							sortDirection={propertiesSortDirection}
							onSort={(field) => {
								if (propertiesSortField === field) {
									setPropertiesSortDirection(propertiesSortDirection === 'asc' ? 'desc' : 'asc');
								} else {
									setPropertiesSortField(field);
									setPropertiesSortDirection('desc');
								}
							}}
						/>
					),
				},
				{
					title: dict.CLEANINGS_TITLE,
					actionButton: (
						<Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
							<Plus className="size-4 mr-1" />
							{dict.NEW_CLEANING}
						</Button>
					),
					content: (
						<CleaningsTable
							data={tableData}
							fetchById={fetchCleaningById}
							onUpsert={handleUpsert}
							userRole="admin"
							excludeHost={true}
							hideCleanerPay={true}
							emptyMessage={dict.EMPTY_CLEANINGS}
							onRefresh={refreshAll}
							pageSize={10}
							totalCount={cleanings.length}
							availableCleaners={availableCleaners}
						/>
					),
				},
			]}>
			<Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
				<DialogContent className="p-0 overflow-hidden max-w-2xl border-none">
					{host && (
						<FormContainer
							variant="dialog"
							title={DICT.CLEANINGS.CREATE.TITLE}
							description={DICT.CLEANINGS.CREATE.MESSAGE}>
							<CleaningForm
								onSubmit={handleCreateCleaning}
								onCancel={() => setIsCreateModalOpen(false)}
								disableCreateProperty={true}
								availableProperties={properties}
							/>
						</FormContainer>
					)}
				</DialogContent>
			</Dialog>

			<Dialog open={propertyModal.isViewOpen} onOpenChange={() => propertyModal.handleClose()}>
				<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{dict.PROPERTY_DETAILS}</DialogTitle>
						<DialogDescription>{dict.PROPERTY_MESSAGE}</DialogDescription>
					</DialogHeader>
					{viewingPropertyLoading ? (
						<Loading />
					) : viewingProperty ? (
						<PropertyDetailView property={viewingProperty} onEdit={() => {}} onDelete={() => {}} />
					) : null}
				</DialogContent>
			</Dialog>

			<PropertyPriceDialog
				open={editingProperty !== null}
				onOpenChange={(open) => {
					if (!open) {
						setEditingProperty(null);
					}
				}}
				propertyId={editingProperty?.id ?? ''}
				propertyAddress={`${editingProperty?.address_line_1 ?? ''}, ${editingProperty?.postcode ?? ''}`}
				currentPrice={editingProperty?.price_per_cleaning ?? null}
				onSuccess={refresh}
			/>
		</UserDetailLayout>
	);
}
