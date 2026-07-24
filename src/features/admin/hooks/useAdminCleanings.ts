'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/components/Toast';
import { DICT } from '@/dictionary';
import { cleaningService } from '@/features/admin/services/cleaningService';
import { userService } from '@/features/admin/services/userService';
import type {
	AdminCleaning,
	AvailableCleaner,
	CleaningFilters,
	CleaningStatus,
} from '@/features/admin/types';
import { CLEANING_STATUS } from '@/features/cleanings/types';
import { supabase } from '@/lib/supabaseClient';

interface UseAdminCleaningsResult {
	cleanings: AdminCleaning[];
	loading: boolean;
	totalCount: number;
	statusFilter: string;
	searchQuery: string;
	cleanerFilter: string;
	upcomingFilter: boolean;
	page: number;
	sortField: string;
	sortDirection: 'asc' | 'desc';
	availableCleaners: AvailableCleaner[];
	isAssignModalOpen: boolean;
	selectedCleaning: string;
	selectedCleaner: string;
	setStatusFilter: (status: string) => void;
	setSearchQuery: (query: string) => void;
	setCleanerFilter: (filter: string) => void;
	setUpcomingFilter: (value: boolean) => void;
	setPage: (page: number) => void;
	setSortField: (field: string) => void;
	setSortDirection: (direction: 'asc' | 'desc') => void;
	setIsAssignModalOpen: (open: boolean) => void;
	setSelectedCleaning: (id: string) => void;
	setSelectedCleaner: (id: string) => void;
	handleAssignCleaner: () => Promise<boolean>;
	handleUnassignCleaner: (cleaningId: string) => Promise<boolean>;
	openAssignModal: (cleaningId: string) => void;
	refresh: () => Promise<void>;
	allData: AdminCleaning[];
	hasMore: boolean;
	loadMore: () => Promise<void>;
	loadingMore: boolean;
	onPageChange: (page: number) => void;
}

const validStatuses = new Set<string>(['all', ...Object.values(CLEANING_STATUS)]);

function isValidStatus(value: string): value is CleaningStatus | 'all' {
	return validStatuses.has(value);
}

export function useAdminCleanings(): UseAdminCleaningsResult {
	const [cleanings, setCleanings] = useState<AdminCleaning[]>([]);
	const [loading, setLoading] = useState(true);
	const [allData, setAllData] = useState<AdminCleaning[]>([]);
	const [loadingMore, setLoadingMore] = useState(false);
	const [totalCount, setTotalCount] = useState(0);

	const [statusFilter, setStatusFilter] = useState<CleaningStatus | 'all'>('all');
	const [searchQuery, setSearchQuery] = useState('');
	const [cleanerFilter, setCleanerFilter] = useState<string>('all');
	const [upcomingFilter, setUpcomingFilter] = useState(false);
	const [page, setPage] = useState(1);
	const [sortField, setSortField] = useState<string>('date');
	const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
	const limit = 20;
	const pageRef = useRef(page);
	pageRef.current = page;

	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
	const requestIdRef = useRef(0);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchQuery(searchQuery);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const [availableCleaners, setAvailableCleaners] = useState<AvailableCleaner[]>([]);

	const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
	const [selectedCleaning, setSelectedCleaning] = useState('');
	const [selectedCleaner, setSelectedCleaner] = useState('');

	const fetchData = useCallback(
		async (targetPage: number, mode: 'replace' | 'append' = 'replace') => {
			const requestId = ++requestIdRef.current;

			if (mode === 'replace') {
				setLoading(true);
			} else {
				setLoadingMore(true);
			}

			const filters: CleaningFilters = {};
			if (statusFilter !== 'all') {
				filters.status = statusFilter;
			}
			if (cleanerFilter !== 'all') {
				filters.cleanerId = cleanerFilter;
			}
			filters.search = debouncedSearchQuery || undefined;
			filters.upcoming = upcomingFilter || undefined;

			const [cleaningsResult, countResult] = await Promise.all([
				cleaningService.getAllCleanings(filters, targetPage, limit, sortField, sortDirection),
				cleaningService.getCleaningsCount(filters),
			]);

			if (requestId !== requestIdRef.current) {
				return;
			}

			if (cleaningsResult.error) {
				toast.error(cleaningsResult.error);
			} else {
				const pageData = cleaningsResult.data || [];
				if (mode === 'append') {
					setAllData((prev) => [...prev, ...pageData]);
				} else {
					setAllData(pageData);
				}
				setCleanings(pageData);
			}

			if (!countResult.error) {
				setTotalCount(countResult.data || 0);
			}

			if (mode === 'replace') {
				setLoading(false);
			} else {
				setLoadingMore(false);
			}
		},
		[statusFilter, cleanerFilter, debouncedSearchQuery, sortField, sortDirection, upcomingFilter],
	);

	const refetchCurrentPage = useCallback(() => {
		return fetchData(page, 'replace');
	}, [fetchData, page]);

	const fetchAvailableCleaners = useCallback(async () => {
		const result = await userService.getAvailableCleaners();
		if (result.error) {
			toast.error(result.error);
		} else {
			setAvailableCleaners(result.data || []);
		}
	}, []);

	const refresh = useCallback(async () => {
		await Promise.all([refetchCurrentPage(), fetchAvailableCleaners()]);
	}, [refetchCurrentPage, fetchAvailableCleaners]);

	useEffect(() => {
		fetchData(pageRef.current, 'replace');
	}, [fetchData]);

	useEffect(() => {
		fetchAvailableCleaners();
	}, [fetchAvailableCleaners]);

	const cleaningChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

	const cleanupChannel = useCallback(() => {
		if (cleaningChannelRef.current) {
			supabase.removeChannel(cleaningChannelRef.current);
			cleaningChannelRef.current = null;
		}
	}, []);

	const setupChannel = useCallback(() => {
		if (import.meta.env.DEV) {
			return;
		}

		if (cleaningChannelRef.current) {
			return;
		}

		const newChannel = supabase
			.channel('admin-cleanings-realtime')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'cleanings',
				},
				() => {
					fetchData(page, 'replace');
				},
			)
			.subscribe();

		cleaningChannelRef.current = newChannel;
	}, [fetchData, page]);

	useEffect(() => {
		cleanupChannel();
		setupChannel();

		return () => {
			cleanupChannel();
		};
	}, [setupChannel, cleanupChannel]);

	const handleAssignCleaner = useCallback(async (): Promise<boolean> => {
		if (!selectedCleaning || !selectedCleaner) {
			toast.error(DICT.CLEANINGS.ASSIGN_CLEANER.TOAST_ERROR);
			return false;
		}
		const result = await cleaningService.assignCleaner(selectedCleaning, selectedCleaner);
		if (result.error) {
			toast.error(result.error);
			return false;
		}
		toast.success(DICT.CLEANINGS.ASSIGN_CLEANER.TOAST_SUCCESS);
		setIsAssignModalOpen(false);
		await refetchCurrentPage();
		return true;
	}, [selectedCleaning, selectedCleaner, refetchCurrentPage]);

	const handleUnassignCleaner = useCallback(
		async (cleaningId: string): Promise<boolean> => {
			const result = await cleaningService.unassignCleaner(cleaningId);
			if (result.error) {
				toast.error(result.error);
				return false;
			}
			toast.success('Cleaner unassigned');
			await refetchCurrentPage();
			return true;
		},
		[refetchCurrentPage],
	);

	const openAssignModal = useCallback(
		(cleaningId: string) => {
			setSelectedCleaning(cleaningId);
			const cleaning = cleanings.find((c) => c.id === cleaningId);
			setSelectedCleaner(cleaning?.cleaner_id || '');
			setIsAssignModalOpen(true);
		},
		[cleanings],
	);

	const loadMore = useCallback(async () => {
		const nextPage = page + 1;
		setPage(nextPage);
		await fetchData(nextPage, 'append');
	}, [fetchData, page]);

	const onPageChange = useCallback(
		(newPage: number) => {
			setPage(newPage);
			fetchData(newPage, 'replace');
		},
		[fetchData],
	);

	const hasMore = allData.length < totalCount;

	return {
		cleanings,
		loading,
		totalCount,
		statusFilter,
		searchQuery,
		cleanerFilter,
		upcomingFilter,
		page,
		sortField,
		sortDirection,
		availableCleaners,
		isAssignModalOpen,
		selectedCleaning,
		selectedCleaner,
		setStatusFilter: (status: string) => {
			if (isValidStatus(status)) {
				setStatusFilter(status);
			}
		},
		setSearchQuery,
		setCleanerFilter,
		setUpcomingFilter,
		setPage,
		setSortField,
		setSortDirection,
		setIsAssignModalOpen,
		setSelectedCleaning,
		setSelectedCleaner,
		handleAssignCleaner,
		handleUnassignCleaner,
		openAssignModal,
		refresh,
		allData,
		hasMore,
		loadMore,
		loadingMore,
		onPageChange,
	};
}
