'use client';

import { Banknote, Eye } from 'lucide-react';
import { useMemo } from 'react';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DICT } from '@/dictionary';
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
	onEditPrice?: (property: Property) => void;
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
	onEditPrice,
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
				key: 'price_per_cleaning',
				label: 'Price',
				sortable: false,
				render: (item) =>
					item.price_per_cleaning
						? `${DICT.COMMON.CURRENCY}${Number(item.price_per_cleaning).toFixed(2)}`
						: '-',
			},
			{
				key: 'actions',
				label: 'Actions',
				sortable: false,
				render: (item) => (
					<div className="flex items-center justify-end gap-1">
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
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="secondary" size="icon-sm" onClick={() => onEditPrice?.(item)}>
									<Banknote className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Set Price</p>
							</TooltipContent>
						</Tooltip>
					</div>
				),
			},
		];

		return cols;
	}, [onView, onEditPrice]);

	const renderMobileHeader = useMemo(
		() => (property: Property) => (
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<p className="font-medium truncate">{property.address_line_1}</p>
					<p className="text-sm text-muted-foreground">
						{property.postcode}
						{property.town_city ? `, ${property.town_city}` : ''}
					</p>
					<p className="text-xs text-muted-foreground mt-1">
						{property.price_per_cleaning
							? `${DICT.COMMON.CURRENCY}${Number(property.price_per_cleaning).toFixed(2)}`
							: 'No price set'}
					</p>
				</div>

				<div className="flex gap-1 shrink-0">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="secondary"
								size="sm"
								className="h-8 w-8 p-0 shrink-0"
								onClick={() => onEditPrice?.(property)}>
								<Banknote className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Set Price</p>
						</TooltipContent>
					</Tooltip>
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
			</div>
		),
		[onView, onEditPrice],
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
