'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/components/Toast';
import {
	type AdminCleaning,
	type CleaningFilters,
	type CleaningStatus,
	cleaningService,
} from '@/features/admin/cleaningService';
import { type AvailableCleaner, userService } from '@/features/admin/userService';
import { supabase } from '@/lib/supabaseClient';

interface UseAdminCleaningsResult {
	cleanings: AdminCleaning[];
	loading: boolean;
	totalCount: number;
	statusFilter: string;
	searchQuery: string;
	cleanerFilter: string;
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
}

export function useAdminCleanings(): UseAdminCleaningsResult {
	const [cleanings, setCleanings] = useState<AdminCleaning[]>([]);
	const [loading, setLoading] = useState(true);
	const [totalCount, setTotalCount] = useState(0);

	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [searchQuery, setSearchQuery] = useState('');
	const [cleanerFilter, setCleanerFilter] = useState<string>('all');
	const [page, setPage] = useState(1);
	const [sortField, setSortField] = useState<string>('date');
	const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
	const limit = 20;

	const [availableCleaners, setAvailableCleaners] = useState<AvailableCleaner[]>([]);

	const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
	const [selectedCleaning, setSelectedCleaning] = useState('');
	const [selectedCleaner, setSelectedCleaner] = useState('');

	const fetchCleanings = useCallback(async () => {
		setLoading(true);

		const filters: CleaningFilters = {};
		if (statusFilter !== 'all') {
			filters.status = statusFilter as CleaningStatus;
		}
		if (cleanerFilter !== 'all') {
			filters.cleanerId = cleanerFilter;
		}
		filters.search = searchQuery || undefined;

		const [cleaningsResult, countResult] = await Promise.all([
			cleaningService.getAllCleanings(filters, page, limit, sortField, sortDirection),
			cleaningService.getCleaningsCount(filters),
		]);

		if (cleaningsResult.error) {
			toast.error(cleaningsResult.error);
		} else {
			setCleanings(cleaningsResult.data || []);
		}

		if (!countResult.error) {
			setTotalCount(countResult.data || 0);
		}
		setLoading(false);
	}, [statusFilter, cleanerFilter, page, searchQuery, sortField, sortDirection]);

	const fetchAvailableCleaners = useCallback(async () => {
		const result = await userService.getAvailableCleaners();
		if (!result.error) {
			setAvailableCleaners(result.data || []);
		}
	}, []);

	const refresh = useCallback(async () => {
		await Promise.all([fetchCleanings(), fetchAvailableCleaners()]);
	}, [fetchCleanings, fetchAvailableCleaners]);

	useEffect(() => {
		fetchCleanings();
	}, [fetchCleanings]);

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
					fetchCleanings();
				},
			)
			.subscribe();

		cleaningChannelRef.current = newChannel;
	}, [fetchCleanings]);

	useEffect(() => {
		cleanupChannel();
		setupChannel();

		return () => {
			cleanupChannel();
		};
	}, [setupChannel, cleanupChannel]);

	const handleAssignCleaner = useCallback(async (): Promise<boolean> => {
		if (!selectedCleaning || !selectedCleaner) {
			toast.error('Please select a cleaner');
			return false;
		}
		const result = await cleaningService.assignCleaner(selectedCleaning, selectedCleaner);
		if (result.error) {
			toast.error(result.error);
			return false;
		}
		toast.success('Cleaner assigned');
		setIsAssignModalOpen(false);
		await fetchCleanings();
		return true;
	}, [selectedCleaning, selectedCleaner, fetchCleanings]);

	const handleUnassignCleaner = useCallback(
		async (cleaningId: string): Promise<boolean> => {
			const result = await cleaningService.unassignCleaner(cleaningId);
			if (result.error) {
				toast.error(result.error);
				return false;
			}
			toast.success('Cleaner unassigned');
			await fetchCleanings();
			return true;
		},
		[fetchCleanings],
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

	return {
		cleanings,
		loading,
		totalCount,
		statusFilter,
		searchQuery,
		cleanerFilter,
		page,
		sortField,
		sortDirection,
		availableCleaners,
		isAssignModalOpen,
		selectedCleaning,
		selectedCleaner,
		setStatusFilter,
		setSearchQuery,
		setCleanerFilter,
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
	};
}
