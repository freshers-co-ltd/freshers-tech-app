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
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Loading } from '@/components/Loading';
import { SortIcon } from '@/components/SortIcon';
import { Button } from '@/components/ui/button';
import { Card, CardFooter } from '@/components/ui/card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

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
	renderMobileHeader?: (item: T) => React.ReactNode;
	priorityColumns?: string[];
	excludeFromExpanded?: string[];
	allData?: T[];
	hasMore?: boolean;
	onLoadMore?: () => void;
	loadingMore?: boolean;
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
	renderMobileHeader,
	priorityColumns,
	excludeFromExpanded,
	allData,
	hasMore,
	onLoadMore,
	loadingMore = false,
}: DataTableProps<T>) {
	const [sorting, setSorting] = useState<SortingState>(() => {
		if (sortField) {
			return [{ id: sortField, desc: sortDirection === 'desc' }];
		}
		return [];
	});

	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

	const toggleExpanded = (id: string) => {
		setExpandedCards((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

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

	if (loading && !loadingMore) {
		return <Loading absolute={false} />;
	}

	if (data.length === 0) {
		return (
			<Card className="p-12 text-center">
				<p className="text-muted-foreground">{emptyMessage}</p>
			</Card>
		);
	}

	const showPagination = totalCount !== undefined;
	const sortableColumns = columns.filter((col) => col.sortable);
	const priorityKeys = new Set(priorityColumns || []);
	const excludeKeys = new Set(excludeFromExpanded || []);
	const mobileData = allData ?? data;

	return (
		<>
			<div className="grid gap-3 md:hidden w-full max-w-full box-border overflow-hidden">
				{sortableColumns.length > 0 && (
					<div className="flex gap-2">
						<Select
							value={sortField || sortableColumns[0]?.key || ''}
							onValueChange={(value) => {
								onSort?.(value);
							}}>
							<SelectTrigger className="flex-1 h-9">
								<SelectValue>
									{`Sort by: ${sortableColumns.find((c) => c.key === (sortField || sortableColumns[0]?.key))?.label || ''}`}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{sortableColumns.map((col) => (
									<SelectItem key={col.key} value={col.key}>
										{col.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button
							variant="outline"
							size="icon-sm"
							onClick={() => {
								if (sortField && onSort) {
									onSort(sortField);
								} else if (sortableColumns[0]?.key && onSort) {
									onSort(sortableColumns[0].key);
								}
							}}>
							{sortDirection === 'asc' ? (
								<ArrowUp className="size-4" />
							) : (
								<ArrowDown className="size-4" />
							)}
						</Button>
					</div>
				)}
				{mobileData.map((item) => {
					const itemId = String(item[keyField]);
					const isExpanded = expandedCards.has(itemId);

					const expandedColumns = columns.filter(
						(col) => !priorityKeys.has(col.key) && !excludeKeys.has(col.key),
					);

					return (
						<Card
							key={itemId}
							className="w-full max-w-full box-border overflow-hidden p-3 pb-1 gap-2">
							{renderMobileHeader ? (
								renderMobileHeader(item)
							) : (
								<div>
									{columns.slice(0, 3).map((col) => (
										<div key={col.key}>
											{col.render
												? col.render(item)
												: String((item as Record<string, unknown>)[col.key] ?? '-')}
										</div>
									))}
								</div>
							)}

							{isExpanded && expandedColumns.length > 0 && (
								<div className="mt-2 pt-2 border-t">
									{expandedColumns.map((col) => (
										<div key={col.key} className="grid grid-cols-[100px_1fr] py-1 gap-x-2">
											<span className="text-sm font-medium truncate">{col.label}</span>
											<span className="text-sm truncate">
												{col.render
													? col.render(item)
													: String((item as Record<string, unknown>)[col.key] ?? '-')}
											</span>
										</div>
									))}
								</div>
							)}

							{(priorityColumns || excludeFromExpanded) && (
								<CardFooter className="border-t p-0!">
									<Button
										variant="ghost"
										className="w-full p-0 h-8 text-sm"
										onClick={(e) => {
											e.stopPropagation();
											toggleExpanded(itemId);
										}}>
										{isExpanded ? 'Show Less' : 'Show More'}
									</Button>
								</CardFooter>
							)}
						</Card>
					);
				})}
				{hasMore && onLoadMore && (
					<Button
						variant="default"
						className="w-full mt-2"
						onClick={onLoadMore}
						disabled={loadingMore}>
						{loadingMore ? (
							<>
								<span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
								Loading...
							</>
						) : (
							'Load More'
						)}
					</Button>
				)}
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
													<div className="flex items-center gap-1">
														{flexRender(header.column.columnDef.header, header.getContext())}
														<SortIcon
															currentField={header.id}
															sortField={sortField || ''}
															sortDirection={sortDirection || 'asc'}
															onClick={() => header.column.toggleSorting()}
														/>
													</div>
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

				{showPagination && (
					<div className="flex items-center justify-between px-4 py-2 border-t">
						<p className="text-sm text-muted-foreground">
							{(() => {
								const start = (page - 1) * pageSize + 1;
								const end = Math.min(page * pageSize, totalCount ?? 0);
								return totalCount === 0 ? '0 results' : `Showing ${start}-${end} of ${totalCount}`;
							})()}
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
								disabled={!totalCount || page * pageSize >= totalCount}
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
