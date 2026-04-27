'use client';

import {
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	type ColumnDef as TanStackColumnDef,
	useReactTable,
	type VisibilityState,
} from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SortIcon } from '@/components/SortIcon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export interface ColumnDef<T> {
	key: string;
	label: string;
	sortable?: boolean;
	render?: (item: T) => React.ReactNode;
	className?: string;
}

interface DataTableProps<T> {
	data: T[];
	columns: ColumnDef<T>[];
	loading?: boolean;
	emptyMessage?: string;
	sortField?: string;
	sortDirection?: 'asc' | 'desc';
	onSort?: (field: string) => void;
	page?: number;
	totalCount?: number;
	pageSize?: number;
	onPageChange?: (page: number) => void;
	keyField: keyof T;
	renderMobileCard?: (item: T) => React.ReactNode;
}

export function DataTable<T>({
	data,
	columns,
	loading = false,
	emptyMessage = 'No data found',
	sortField,
	sortDirection,
	onSort,
	page = 1,
	totalCount,
	pageSize = 20,
	onPageChange,
	keyField,
	renderMobileCard,
}: DataTableProps<T>) {
	const [sorting, setSorting] = useState<SortingState>(() => {
		if (sortField) {
			return [{ id: sortField, desc: sortDirection === 'desc' }];
		}
		return [];
	});

	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

	const tanStackColumns = useMemo<TanStackColumnDef<T>[]>(
		() =>
			columns.map((col) => ({
				id: col.key,
				accessorKey: col.key as keyof T,
				header: () => col.label,
				cell: ({ row }) =>
					col.render ? col.render(row.original) : String(row.original[col.key as keyof T] ?? '-'),
			})),
		[columns],
	);

	const table = useReactTable({
		data,
		columns: tanStackColumns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: (updater) => {
			const newSort = typeof updater === 'function' ? updater(sorting) : updater;
			setSorting(newSort);
			if (newSort.length > 0 && newSort[0] && onSort) {
				onSort(newSort[0].id);
			}
		},
		onColumnVisibilityChange: setColumnVisibility,
		state: {
			sorting,
			columnVisibility,
		},
		initialState: {
			pagination: {
				pageSize,
			},
		},
	});

	if (loading) {
		return (
			<Card className="p-12 text-center">
				<Loader2 className="size-8 animate-spin text-muted-foreground mx-auto" />
			</Card>
		);
	}

	if (data.length === 0) {
		return (
			<Card className="p-12 text-center">
				<p className="text-muted-foreground">{emptyMessage}</p>
			</Card>
		);
	}

	const hasPagination = totalCount && totalCount > pageSize;

	return (
		<>
			<div className="grid gap-4 md:hidden">
				{renderMobileCard
					? data.map((item) => (
							<Card key={String(item[keyField])} className="p-4">
								{renderMobileCard(item)}
							</Card>
						))
					: data.map((item) => (
							<Card key={String(item[keyField])} className="p-4">
								{columns.map((col) => (
									<div
										key={col.key}
										className="grid grid-cols-[1fr_1.5fr] border-b last:border-0 text-sm">
										<div className="py-2 font-medium border-r">{col.label}</div>
										<div className="px-3 py-2 flex items-center justify-center">
											{col.render
												? col.render(item)
												: String((item as Record<string, unknown>)[col.key] ?? '-')}
										</div>
									</div>
								))}
							</Card>
						))}
			</div>

			<Card className="hidden md:block p-0 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-muted/50">
							{table.getHeaderGroups().map((headerGroup) => (
								<tr key={headerGroup.id}>
									{headerGroup.headers.map((header) => {
										const colDef = columns.find((c) => c.key === header.id);
										return (
											<th
												key={header.id}
												className={`text-left p-3 font-medium text-sm ${colDef?.className || ''}`}>
												{header.isPlaceholder ? null : colDef?.sortable && onSort ? (
													<button
														type="button"
														className="flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 font-inherit"
														onClick={() => header.column.toggleSorting()}>
														{flexRender(header.column.columnDef.header, header.getContext())}
														<SortIcon
															currentField={header.id}
															sortField={sortField || ''}
															sortDirection={sortDirection || 'asc'}
															onClick={() => {}}
														/>
													</button>
												) : (
													<span>
														{flexRender(header.column.columnDef.header, header.getContext())}
													</span>
												)}
											</th>
										);
									})}
								</tr>
							))}
						</thead>
						<tbody>
							{table.getRowModel().rows.map((row) => (
								<tr key={row.id} className="border-t hover:bg-muted/30">
									{row.getVisibleCells().map((cell) => {
										const colDef = columns.find((c) => c.key === cell.column.id);
										return (
											<td key={cell.id} className={`p-3 ${colDef?.className || ''}`}>
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{hasPagination && (
					<div className="flex items-center justify-between p-4 border-t">
						<p className="text-sm text-muted-foreground">
							Showing {data.length} of {totalCount}
						</p>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={page === 1}
								onClick={() => onPageChange?.(page - 1)}>
								Previous
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={page * pageSize >= totalCount}
								onClick={() => onPageChange?.(page + 1)}>
								Next
							</Button>
						</div>
					</div>
				)}
			</Card>
		</>
	);
}
