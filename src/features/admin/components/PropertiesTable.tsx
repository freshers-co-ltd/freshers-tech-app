'use client';

import { Eye } from 'lucide-react';
import { useMemo } from 'react';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Property } from '@/features/properties/propertyService';

export interface PropertyData {
	id: string;
	address_line_1: string;
	town_city: string;
	postcode: string;
	type: string;
	bedrooms: number;
	bathrooms: number;
}

export interface PropertiesTableProps {
	data: Property[];
	emptyMessage?: string;
	onView?: (id: string) => void;
	page?: number;
	totalCount?: number;
	pageSize?: number;
	onPageChange?: (page: number) => void;
	loading?: boolean;
	sortField?: string;
	sortDirection?: 'asc' | 'desc';
	onSort?: (field: string) => void;
}

export function PropertiesTable({
	data,
	emptyMessage = 'No properties found',
	onView,
	page = 1,
	totalCount,
	pageSize = 20,
	onPageChange,
	loading = false,
	sortField,
	sortDirection = 'asc',
	onSort,
}: PropertiesTableProps) {
	const handleSort = useMemo(
		() => (field: string) => {
			onSort?.(field);
		},
		[onSort],
	);

	const columns = useMemo(() => {
		const cols: {
			key: string;
			label: string;
			sortable: boolean;
			render?: (item: Property) => React.ReactNode;
		}[] = [
			{
				key: 'address_line_1',
				label: 'Address',
				sortable: true,
				render: (item) => item.address_line_1,
			},
			{
				key: 'postcode',
				label: 'Postcode',
				sortable: true,
				render: (item) => item.postcode,
			},
			{
				key: 'town_city',
				label: 'City',
				sortable: true,
				render: (item) => item.town_city,
			},
			{
				key: 'type',
				label: 'Type',
				sortable: true,
				render: (item) => item.type.charAt(0).toUpperCase() + item.type.slice(1),
			},
			{
				key: 'bedrooms',
				label: 'No. of bedrooms',
				sortable: true,
				render: (item) => item.bedrooms,
			},
			{
				key: 'bathrooms',
				label: 'No. of bathrooms',
				sortable: true,
				render: (item) => item.bathrooms,
			},
			{
				key: 'actions',
				label: 'Actions',
				sortable: false,
				render: (item) => (
					<div className="flex items-center justify-end">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="secondary" size="icon-sm" onClick={() => onView?.(item.id)}>
									<Eye className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>View Details</p>
							</TooltipContent>
						</Tooltip>
					</div>
				),
			},
		];

		return cols;
	}, [onView]);

	const renderMobileHeader = useMemo(
		() => (property: Property) => (
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<p className="font-medium truncate">{property.address_line_1}</p>
					<p className="text-sm text-muted-foreground">
						{property.postcode}
						{property.town_city ? `, ${property.town_city}` : ''}
					</p>
				</div>

				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="secondary"
							size="sm"
							className="h-8 w-8 p-0 shrink-0"
							onClick={() => onView?.(property.id)}>
							<Eye className="size-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>View Details</p>
					</TooltipContent>
				</Tooltip>
			</div>
		),
		[onView],
	);

	const priorityColumns = ['address_line_1', 'postcode', 'town_city', 'actions'];

	const excludeFromExpanded = ['address_line_1', 'postcode', 'town_city', 'actions'];

	return (
		<DataTable
			data={data}
			columns={columns}
			keyField="id"
			emptyMessage={emptyMessage}
			sortField={sortField}
			sortDirection={sortDirection}
			onSort={handleSort}
			loading={loading}
			page={page}
			totalCount={totalCount}
			pageSize={pageSize}
			onPageChange={onPageChange}
			renderMobileHeader={renderMobileHeader}
			priorityColumns={priorityColumns}
			excludeFromExpanded={excludeFromExpanded}
		/>
	);
}
