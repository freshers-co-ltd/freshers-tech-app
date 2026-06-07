'use client';

import { ClockFading, Plus, Search, ShieldBan, User, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Stat, StatIndicator, StatLabel, StatValue } from '@/components/ui/stat';
import { DICT } from '@/dictionary';
import { AdminActionDialogs } from '@/features/admin/components/AdminActionDialogs';
import { InviteUserDialog } from '@/features/admin/components/InviteUserDialog';
import { UsersTable } from '@/features/admin/components/UsersTable';
import { useAdminActionDialogs } from '@/features/admin/hooks/useAdminActionDialogs';
import { useAdminUsers } from '@/features/admin/hooks/useAdminUsers';
import type { UserTab } from '@/features/admin/types';

export function AdminUsersPage() {
	const {
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
		handleSort,
		handleInvite,
		handleResetPassword,
		handleBan,
		handleUnban,
		allData,
		hasMore,
		loadMore,
		loadingMore,
		onPageChange,
	} = useAdminUsers();

	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
	const dialogs = useAdminActionDialogs();

	const handleResetPasswordClick = (userId: string) => {
		const user = users.find((u) => u.id === userId);
		dialogs.openResetPassword(userId, user?.full_name || '');
	};

	const handleBanClick = (userId: string) => {
		const user = users.find((u) => u.id === userId);
		dialogs.openBan(userId, user?.full_name || '');
	};

	const handleUnbanClick = (userId: string) => {
		const user = users.find((u) => u.id === userId);
		dialogs.openUnban(userId, user?.full_name || '');
	};

	const handleBanConfirm = async () => {
		const id = dialogs.selectedUser.id;
		if (!id) {
			return;
		}
		const result = await handleBan(id);
		if (result.error) {
			toast.error(result.error || DICT.ADMIN.USERS.BAN_USER.TOAST_ERROR);
		} else {
			toast.success(DICT.ADMIN.USERS.BAN_USER.TOAST_SUCCESS);
		}
		dialogs.close();
	};

	const handleUnbanConfirm = async () => {
		const id = dialogs.selectedUser.id;
		if (!id) {
			return;
		}
		const result = await handleUnban(id);
		if (result.error) {
			toast.error(result.error || DICT.ADMIN.USERS.UNBAN_USER.TOAST_ERROR);
		} else {
			toast.success(DICT.ADMIN.USERS.UNBAN_USER.TOAST_SUCCESS);
		}
		dialogs.close();
	};

	const handleResetPasswordConfirm = async () => {
		const id = dialogs.selectedUser.id;
		if (!id) {
			return;
		}
		const result = await handleResetPassword(id);
		if (result.error) {
			toast.error(result.error || DICT.ADMIN.USERS.PASSWORD_RESET.TOAST_ERROR);
		} else {
			toast.success(DICT.ADMIN.USERS.PASSWORD_RESET.TOAST_SUCCESS);
		}
		dialogs.close();
	};

	return (
		<main className="max-width-container p-2 md:p-8">
			<header className="mb-6">
				<div className="space-y-1">
					<h1 className="text-3xl font-bold uppercase text-center md:text-left">User Management</h1>
				</div>
			</header>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
				<Stat>
					<StatIndicator variant="icon" className="text-primary-light">
						<Users />
					</StatIndicator>
					<StatValue>{totalCount}</StatValue>
					<StatLabel>Total Users</StatLabel>
				</Stat>
				<Stat>
					<StatIndicator variant="icon" className="text-success">
						<User />
					</StatIndicator>
					<StatValue>{onlineCount}</StatValue>
					<StatLabel>Online</StatLabel>
				</Stat>
				<Stat>
					<StatIndicator variant="icon" className="text-warning">
						<ClockFading />
					</StatIndicator>
					<StatValue>{recentlyOnline}</StatValue>
					<StatLabel>Recently Online (7d)</StatLabel>
				</Stat>
				<Stat>
					<StatIndicator variant="icon" className="text-destructive">
						<ShieldBan />
					</StatIndicator>
					<StatValue>{bannedCount}</StatValue>
					<StatLabel>Banned</StatLabel>
				</Stat>
			</div>

			<Card className="mb-4 py-1">
				<CardContent className="p-3 space-y-4">
					<div className="flex flex-col sm:flex-row gap-3">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
							<Input
								placeholder="Search users..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										setPage(1);
									}
								}}
								className="pl-9 h-8"
							/>
						</div>
						<Select
							value={onlineTab}
							onValueChange={(v) => {
								setOnlineTab(v as UserTab);
								setPage(1);
							}}>
							<SelectTrigger className="w-[130px]">
								<SelectValue placeholder="Role" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Roles</SelectItem>
								<SelectItem value="host">Hosts</SelectItem>
								<SelectItem value="cleaner">Cleaners</SelectItem>
								<SelectItem value="admin">Admins</SelectItem>
							</SelectContent>
						</Select>
						<Button className="h-8" onClick={() => setIsInviteModalOpen(true)}>
							<Plus className="size-4 mr-1" />
							<span className="sm:hidden">Invite</span>
							<span className="hidden sm:inline">Invite User</span>
						</Button>
					</div>
				</CardContent>
			</Card>

			<UsersTable
				data={users}
				loading={loading}
				page={page}
				totalCount={totalCount}
				onPageChange={onPageChange}
				sortField={sortField}
				sortDirection={sortDirection}
				onSort={(field) =>
					handleSort(field as 'name' | 'email' | 'role' | 'status' | 'last_online' | 'joined')
				}
				onResetPassword={handleResetPasswordClick}
				onBan={handleBanClick}
				onUnban={handleUnbanClick}
				allData={allData}
				hasMore={hasMore}
				onLoadMore={loadMore}
				loadingMore={loadingMore}
			/>

			<InviteUserDialog
				open={isInviteModalOpen}
				onOpenChange={setIsInviteModalOpen}
				onInvite={handleInvite}
			/>

			<AdminActionDialogs
				{...dialogs}
				onBanOpenChange={(o) => !o && dialogs.close()}
				onUnbanOpenChange={(o) => !o && dialogs.close()}
				onResetPasswordOpenChange={(o) => !o && dialogs.close()}
				onDeleteUserOpenChange={(o) => !o && dialogs.close()}
				onConfirmBan={handleBanConfirm}
				onConfirmUnban={handleUnbanConfirm}
				onConfirmResetPassword={handleResetPasswordConfirm}
				onConfirmDeleteUser={() => {}}
			/>
		</main>
	);
}
