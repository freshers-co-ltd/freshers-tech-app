'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { analyticsService } from '@/features/admin/services/analyticsService';
import type { AuditFilters, AuditLogEntry } from '@/features/admin/types';

const PAGE_SIZE = 20;

interface UseAuditLogDialogOptions {
	open: boolean;
}

interface UseAuditLogDialogResult {
	logs: AuditLogEntry[];
	loading: boolean;
	page: number;
	filters: AuditFilters;
	dateRange: DateRange | undefined;
	pageSize: number;
	handleFilterChange: (key: keyof AuditFilters, value: string) => void;
	handleDateRangeChange: (range: DateRange | undefined) => void;
	handlePrevPage: () => void;
	handleNextPage: () => void;
	handleClearFilters: () => void;
}

export function useAuditLogDialog({ open }: UseAuditLogDialogOptions): UseAuditLogDialogResult {
	const [logs, setLogs] = useState<AuditLogEntry[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(1);
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

	const handleDateRangeChange = (range: DateRange | undefined) => {
		setDateRange(range);
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

	return {
		logs,
		loading,
		page,
		filters,
		dateRange,
		pageSize: PAGE_SIZE,
		handleFilterChange,
		handleDateRangeChange,
		handlePrevPage,
		handleNextPage,
		handleClearFilters,
	};
}
