'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/components/Toast';
import { analyticsService } from '@/features/admin/services/analyticsService';
import { userService } from '@/features/admin/services/userService';
import type {
	AdminUser,
	SortDirection,
	SortField,
	UserFilters,
	UserTab,
} from '@/features/admin/types';
import type { UserRole } from '@/features/auth/types';

interface UseAdminUsersResult {
	users: AdminUser[];
	loading: boolean;
	totalCount: number;
	onlineCount: number;
	bannedCount: number;
	recentlyOnline: number;
	onlineTab: UserTab;
	searchQuery: string;
	page: number;
	sortField: SortField;
	sortDirection: SortDirection;
	setOnlineTab: (tab: UserTab) => void;
	setSearchQuery: (query: string) => void;
	setPage: (page: number) => void;
	setSortField: (field: SortField) => void;
	handleSort: (field: SortField) => void;
	handleInvite: (email: string, role: UserRole, fullName: string) => Promise<boolean>;
	handleResetPassword: (
		userId: string,
		onRefetch?: () => Promise<void>,
	) => Promise<{ error: string | null }>;
	handleBan: (userId: string, onRefetch?: () => Promise<void>) => Promise<{ error: string | null }>;
	handleUnban: (
		userId: string,
		onRefetch?: () => Promise<void>,
	) => Promise<{ error: string | null }>;
	refresh: () => Promise<void>;
	allData: AdminUser[];
	hasMore: boolean;
	loadMore: () => Promise<void>;
	loadingMore: boolean;
	onPageChange: (page: number) => void;
}

export function useAdminUsers(): UseAdminUsersResult {
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [allData, setAllData] = useState<AdminUser[]>([]);
	const [loadingMore, setLoadingMore] = useState(false);
	const [totalCount, setTotalCount] = useState(0);
	const [onlineCount, setOnlineCount] = useState(0);
	const [bannedCount, setBannedCount] = useState(0);
	const [recentlyOnline, setRecentlyOnline] = useState(0);

	const [onlineTab, setOnlineTab] = useState<UserTab>('all');
	const [searchQuery, setSearchQuery] = useState('');
	const [page, setPage] = useState(1);
	const [sortField, setSortField] = useState<SortField>('name');
	const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

	const limit = 20;
	const pageRef = useRef(page);
	pageRef.current = page;

	const fetchData = useCallback(
		async (targetPage: number, mode: 'replace' | 'append' = 'replace') => {
			if (mode === 'replace') {
				setLoading(true);
			} else {
				setLoadingMore(true);
			}

			const roleMap: Record<UserTab, UserRole | undefined> = {
				all: undefined,
				host: 'host',
				cleaner: 'cleaner',
				admin: 'admin',
			};
			const filters: UserFilters = {
				role: roleMap[onlineTab],
				search: searchQuery || undefined,
			};
			const [usersResult, countResult] = await Promise.all([
				userService.getUsers(filters, targetPage, limit, sortField, sortDirection),
				userService.getUsersCount(filters),
			]);
			if (usersResult.error) {
				toast.error(usersResult.error);
			} else {
				const pageData = usersResult.data || [];
				if (mode === 'append') {
					setAllData((prev) => [...prev, ...pageData]);
				} else {
					setAllData(pageData);
				}
				setUsers(pageData);
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
		[onlineTab, searchQuery, sortField, sortDirection],
	);

	const refetchCurrentPage = useCallback(() => {
		return fetchData(page, 'replace');
	}, [fetchData, page]);

	const fetchCounts = useCallback(async () => {
		const statsResult = await analyticsService.getUserStats();
		if (!statsResult.error && statsResult.data) {
			setOnlineCount(statsResult.data.online_now);
			setBannedCount(statsResult.data.banned_users);
			setTotalCount(statsResult.data.total_users);
			setRecentlyOnline(statsResult.data.recently_online);
		}
	}, []);

	const refresh = useCallback(async () => {
		await Promise.all([refetchCurrentPage(), fetchCounts()]);
	}, [refetchCurrentPage, fetchCounts]);

	useEffect(() => {
		fetchData(pageRef.current, 'replace');
	}, [fetchData]);

	useEffect(() => {
		fetchCounts();
	}, [fetchCounts]);

	const handleSort = useCallback(
		(field: SortField) => {
			if (sortField === field) {
				setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
			} else {
				setSortField(field);
				setSortDirection('asc');
			}
			setPage(1);
		},
		[sortField],
	);

	const handleInvite = useCallback(
		async (email: string, role: UserRole, fullName: string): Promise<boolean> => {
			const result = await userService.inviteUser(email, role, fullName);
			if (result.error) {
				toast.error(result.error);
				return false;
			}
			toast.success('Invitation sent successfully');
			await refetchCurrentPage();
			return true;
		},
		[refetchCurrentPage],
	);

	const handleResetPassword = useCallback(
		async (userId: string, onRefetch?: () => Promise<void>): Promise<{ error: string | null }> => {
			const result = await userService.resetPassword(userId);
			if (result.error) {
				return { error: result.error };
			}
			await onRefetch?.();
			return { error: null };
		},
		[],
	);

	const handleBan = useCallback(
		async (userId: string, onRefetch?: () => Promise<void>): Promise<{ error: string | null }> => {
			const result = await userService.banUser(userId);
			if (result.error) {
				return { error: result.error };
			}
			await (onRefetch ?? refetchCurrentPage)();
			return { error: null };
		},
		[refetchCurrentPage],
	);

	const handleUnban = useCallback(
		async (userId: string, onRefetch?: () => Promise<void>): Promise<{ error: string | null }> => {
			const result = await userService.unbanUser(userId);
			if (result.error) {
				return { error: result.error };
			}
			await (onRefetch ?? refetchCurrentPage)();
			return { error: null };
		},
		[refetchCurrentPage],
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
		users,
		loading,
		totalCount,
		onlineCount,
		bannedCount,
		recentlyOnline,
		onlineTab,
		searchQuery,
		page,
		sortField,
		sortDirection,
		setOnlineTab,
		setSearchQuery,
		setPage,
		setSortField,
		handleSort,
		handleInvite,
		handleResetPassword,
		handleBan,
		handleUnban,
		refresh,
		allData,
		hasMore,
		loadMore,
		loadingMore,
		onPageChange,
	};
}
