'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Loading } from '@/components/Loading';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { AuditFilters, AuditLogEntry } from '@/features/admin/analyticsService';
import { analyticsService } from '@/features/admin/analyticsService';
import { AuditLogEntryComponent } from '@/features/admin/components/AuditLogEntry';

interface AuditLogDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const PAGE_SIZE = 20;

const TARGET_TABLE_OPTIONS = ['cleanings', 'properties', 'profiles', 'bookings', 'users'];

const ACTION_TYPE_OPTIONS = ['INSERT', 'UPDATE', 'DELETE'];

export function AuditLogDialog({ open, onOpenChange }: AuditLogDialogProps) {
	const [logs, setLogs] = useState<AuditLogEntry[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(1);
	const [_totalPages, setTotalPages] = useState(1);
	const [filters, setFilters] = useState<AuditFilters>({});
	const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

	const fetchLogs = useCallback(async () => {
		setLoading(true);
		const result = await analyticsService.getAuditLogs(
			filters,
			page,
			PAGE_SIZE,
			dateRange?.from ? dateRange.from.toISOString() : null,
			dateRange?.to ? dateRange.to.toISOString() : null,
		);
		if (result.data) {
			setLogs(result.data);
			setTotalPages(Math.ceil((result.data.length < PAGE_SIZE ? page : page + 1) || 1));
		}
		setLoading(false);
	}, [filters, page, dateRange]);

	useEffect(() => {
		if (open) {
			fetchLogs();
		}
	}, [open, fetchLogs]);

	const handleFilterChange = (key: keyof AuditFilters, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value === 'all' ? undefined : value }));
		setPage(1);
	};

	const handlePrevPage = () => {
		if (page > 1) {
			setPage((p) => p - 1);
		}
	};

	const handleNextPage = () => {
		if (logs.length === PAGE_SIZE) {
			setPage((p) => p + 1);
		}
	};

	const handleClearFilters = () => {
		setFilters({});
		setDateRange(undefined);
		setPage(1);
	};

	if (!open) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<button
				type="button"
				className="fixed inset-0 w-full h-full cursor-default bg-black/50"
				onClick={() => onOpenChange(false)}
				aria-label="Close dialog"
			/>
			<div className="relative z-10 flex flex-col w-full max-w-4xl h-[85vh] bg-background rounded-lg shadow-lg">
				<div className="flex items-center justify-between p-4 border-b">
					<h2 className="text-lg font-semibold">Audit Log</h2>
					<Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
						<X className="h-5 w-5" />
					</Button>
				</div>

				<div className="flex flex-wrap gap-3 p-4 border-b bg-muted/30">
					<Select
						value={filters.targetTable || 'all'}
						onValueChange={(v) => handleFilterChange('targetTable', v)}>
						<SelectTrigger className="w-[150px]">
							<SelectValue placeholder="Table" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Tables</SelectItem>
							{TARGET_TABLE_OPTIONS.map((t) => (
								<SelectItem key={t} value={t}>
									{t}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select
						value={filters.actionType || 'all'}
						onValueChange={(v) => handleFilterChange('actionType', v)}>
						<SelectTrigger className="w-[150px]">
							<SelectValue placeholder="Action" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Actions</SelectItem>
							{ACTION_TYPE_OPTIONS.map((a) => (
								<SelectItem key={a} value={a}>
									{a === 'INSERT' ? 'Created' : a === 'UPDATE' ? 'Updated' : 'Deleted'}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<DatePickerWithRange
						value={dateRange}
						onChange={(range) => {
							setDateRange(range);
							setPage(1);
						}}
					/>

					<Button variant="outline" size="sm" onClick={handleClearFilters}>
						Clear
					</Button>
				</div>

				<div className="flex-1 overflow-y-auto p-4">
					{loading ? (
						<Loading />
					) : logs.length === 0 ? (
						<p className="text-center text-muted-foreground py-12">No activity recorded</p>
					) : (
						<div className="space-y-3">
							{logs.map((log) => (
								<AuditLogEntryComponent key={log.id} log={log} />
							))}
						</div>
					)}
				</div>

				<div className="flex items-center justify-between p-4 border-t">
					<span className="text-sm text-muted-foreground">Page {page}</span>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" onClick={handlePrevPage} disabled={page === 1}>
							<ChevronLeft className="h-4 w-4" />
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleNextPage}
							disabled={logs.length < PAGE_SIZE}>
							Next
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
