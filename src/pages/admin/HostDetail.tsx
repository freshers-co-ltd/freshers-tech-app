'use client';

import {
	BadgeCheck,
	BrushCleaning,
	CalendarClock,
	ClipboardList,
	Loader2,
	Plus,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
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
import { cleaningService as adminCleaningService } from '@/features/admin/cleaningService';
import { CleaningsTable } from '@/features/admin/components/CleaningsTable';
import { HostBasePriceDialog } from '@/features/admin/components/HostBasePriceDialog';
import { PropertiesTable } from '@/features/admin/components/PropertiesTable';
import { useAdminUsers } from '@/features/admin/useAdminUsers';
import { type AdminHostDetail, userService } from '@/features/admin/userService';
import type { CleaningFormValues } from '@/features/cleanings/components/CleaningForm';
import { CleaningForm } from '@/features/cleanings/components/CleaningForm';
import { PropertyDetailView } from '@/features/properties/components/PropertyDetailView';
import type { Property } from '@/features/properties/propertyService';
import { useResourceModals } from '@/hooks/useResourceModals';
import { UserDetailLayout } from '@/layouts/UserDetailLayout';
import { supabase } from '@/lib/supabaseClient';

export function AdminHostDetailPage() {
	const dict = DICT.ADMIN.USERS;
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [host, setHost] = useState<AdminHostDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isBasePriceDialogOpen, setIsBasePriceDialogOpen] = useState(false);
	const [propertiesSortField, setPropertiesSortField] = useState<string>('address_line_1');
	const [propertiesSortDirection, setPropertiesSortDirection] = useState<'asc' | 'desc'>('desc');

	const propertyModal = useResourceModals({ resourceName: 'property' });
	const cleaningModal = useResourceModals({ resourceName: 'cleaning' });

	const { handleResetPassword, handleBan, handleUnban } = useAdminUsers();

	const [viewingProperty, setViewingProperty] = useState<Property | null>(null);
	const [viewingPropertyLoading, setViewingPropertyLoading] = useState(false);

	const fetchViewingProperty = useCallback(async () => {
		if (!propertyModal.viewId) {
			return;
		}
		setViewingPropertyLoading(true);
		const { data, error } = await supabase
			.from('properties')
			.select('*')
			.eq('id', propertyModal.viewId)
			.single();
		if (!error && data) {
			setViewingProperty(data as Property);
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

	const fetchHostDetail = useCallback(async () => {
		if (!id) {
			return;
		}
		setLoading(true);
		const result = await userService.getHostDetail(
			id,
			propertiesSortField,
			propertiesSortDirection,
		);
		if (result.error) {
			toast.error(result.error);
			navigate('/admin/users');
		} else {
			setHost(result.data as AdminHostDetail | null);
		}
		setLoading(false);
	}, [id, navigate, propertiesSortField, propertiesSortDirection]);

	useEffect(() => {
		fetchHostDetail();
	}, [fetchHostDetail]);

	const cleaningChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

	useEffect(() => {
		if (!id) {
			return;
		}

		const channel = supabase
			.channel(`admin-host-cleanings-${id}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'cleanings',
					filter: `host_id=eq.${id}`,
				},
				() => {
					fetchHostDetail();
				},
			)
			.subscribe();

		cleaningChannelRef.current = channel;

		return () => {
			if (cleaningChannelRef.current) {
				supabase.removeChannel(cleaningChannelRef.current);
				cleaningChannelRef.current = null;
			}
		};
	}, [id, fetchHostDetail]);

	const onResetPassword = useCallback(async () => {
		if (!host) {
			return { error: 'No user loaded' };
		}
		return handleResetPassword(host.id, fetchHostDetail);
	}, [host, handleResetPassword, fetchHostDetail]);

	const onBan = useCallback(async () => {
		if (!host) {
			return { error: 'No user loaded' };
		}
		return handleBan(host.id, fetchHostDetail);
	}, [host, handleBan, fetchHostDetail]);

	const onUnban = useCallback(async () => {
		if (!host) {
			return { error: 'No user loaded' };
		}
		return handleUnban(host.id, fetchHostDetail);
	}, [host, handleUnban, fetchHostDetail]);

	const handleCreateCleaning = async (values: CleaningFormValues) => {
		if (!id) {
			return;
		}
		const result = await adminCleaningService.createCleaningForHost(
			id,
			values.property_id,
			values.scheduled_start.toISOString(),
			{
				instructions: values.instructions || undefined,
				stocksIncluded: values.stocks_included,
				customTasks: values.custom_tasks?.map((t) => t.description) || [],
			},
		);
		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success(dict.TOASTS.CLEANING_CREATED);
			setIsCreateModalOpen(false);
			fetchHostDetail();
		}
	};

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
		};
	});

	const statsConfig = [
		{
			id: 'total-requested',
			label: 'Total cleanings requested',
			value: stats?.total || 0,
			icon: ClipboardList,
			iconColor: 'text-purple-600',
		},
		{
			id: 'requested',
			label: 'Pending requested cleanings',
			value: stats?.requested || 0,
			icon: CalendarClock,
			iconColor: 'text-yellow-600',
		},
		{
			id: 'pending',
			label: 'Pending confirmed cleanings',
			value: stats?.confirmed || 0,
			icon: BadgeCheck,
			iconColor: 'text-green-600',
		},
		{
			id: 'in-progress',
			label: 'Cleanings in progress',
			value: stats?.in_progress || 0,
			icon: BrushCleaning,
			iconColor: 'text-blue-600',
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
			onEditBasePrice={() => setIsBasePriceDialogOpen(true)}
			stats={statsConfig}
			sections={[
				{
					title: 'Properties',
					content: (
						<PropertiesTable
							data={properties}
							emptyMessage="No properties found"
							onView={(id) => propertyModal.openView(id)}
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
					title: 'Cleaning Requests',
					actionButton: (
						<Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
							<Plus className="size-4 mr-1" />
							New Cleaning Request
						</Button>
					),
					content: (
						<CleaningsTable
							data={tableData}
							excludeHost={true}
							hideCleanerPay={true}
							emptyMessage="No cleanings found"
							onRefresh={fetchHostDetail}
							onView={(id) => cleaningModal.openView(id)}
							pageSize={10}
							totalCount={cleanings.length}
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
						<DialogTitle>Property Details</DialogTitle>
						<DialogDescription>View complete property information</DialogDescription>
					</DialogHeader>
					{viewingPropertyLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="size-6 animate-spin text-muted-foreground" />
						</div>
					) : viewingProperty ? (
						<PropertyDetailView property={viewingProperty} onEdit={() => {}} onDelete={() => {}} />
					) : null}
				</DialogContent>
			</Dialog>

			<HostBasePriceDialog
				open={isBasePriceDialogOpen}
				onOpenChange={setIsBasePriceDialogOpen}
				hostId={id || ''}
				currentPrice={host?.base_price_per_cleaning ?? null}
				onSuccess={fetchHostDetail}
			/>
		</UserDetailLayout>
	);
}
