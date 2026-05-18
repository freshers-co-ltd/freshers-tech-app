'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/components/Toast';
import { analyticsService } from '@/features/admin/analyticsService';
import { type AdminUser, type UserFilters, userService } from '@/features/admin/userService';
import type { UserRole } from '@/features/auth/authService';

type UserTab = 'all' | 'host' | 'cleaner' | 'admin';
type SortField = 'name' | 'email' | 'role' | 'status' | 'last_online' | 'joined';
type SortDirection = 'asc' | 'desc';

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
}

export function useAdminUsers(): UseAdminUsersResult {
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [loading, setLoading] = useState(true);
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

	const fetchUsers = useCallback(async () => {
		setLoading(true);
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
			userService.getUsers(filters, page, limit, sortField, sortDirection),
			userService.getUsersCount(filters),
		]);
		if (usersResult.error) {
			toast.error(usersResult.error);
		} else {
			setUsers(usersResult.data || []);
		}
		if (!countResult.error) {
			setTotalCount(countResult.data || 0);
		}
		setLoading(false);
	}, [onlineTab, page, searchQuery, sortField, sortDirection]);

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
		await Promise.all([fetchUsers(), fetchCounts()]);
	}, [fetchUsers, fetchCounts]);

	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

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
			await fetchUsers();
			return true;
		},
		[fetchUsers],
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
			await (onRefetch ?? fetchUsers)();
			return { error: null };
		},
		[fetchUsers],
	);

	const handleUnban = useCallback(
		async (userId: string, onRefetch?: () => Promise<void>): Promise<{ error: string | null }> => {
			const result = await userService.unbanUser(userId);
			if (result.error) {
				return { error: result.error };
			}
			await (onRefetch ?? fetchUsers)();
			return { error: null };
		},
		[fetchUsers],
	);

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
	};
}
