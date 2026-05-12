'use client';

import { ClockFading, Plus, Search, ShieldBan, User, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
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
import { InviteUserDialog } from '@/features/admin/components/InviteUserDialog';
import { UsersTable } from '@/features/admin/components/UsersTable';
import { useAdminUsers } from '@/features/admin/useAdminUsers';

type UserTab = 'all' | 'host' | 'cleaner' | 'admin';

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
	} = useAdminUsers();

	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
	const [selectedUserName, setSelectedUserName] = useState('');
	const [banDialogOpen, setBanDialogOpen] = useState(false);
	const [unbanDialogOpen, setUnbanDialogOpen] = useState(false);
	const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);

	const handleResetPasswordClick = (userId: string) => {
		const user = users.find((u) => u.id === userId);
		setSelectedUserId(userId);
		setSelectedUserName(user?.full_name || 'this user');
		setResetPasswordDialogOpen(true);
	};

	const handleResetPasswordConfirm = async () => {
		if (selectedUserId) {
			const result = await handleResetPassword(selectedUserId);
			if (result.error) {
				toast.error(result.error);
			} else {
				toast.success(DICT.ADMIN.USERS.TOASTS.PASSWORD_RESET_SENT);
			}
			setSelectedUserId(null);
			setSelectedUserName('');
		}
	};

	const handleBanClick = (userId: string) => {
		const user = users.find((u) => u.id === userId);
		setSelectedUserId(userId);
		setSelectedUserName(user?.full_name || 'this user');
		setBanDialogOpen(true);
	};

	const handleUnbanClick = (userId: string) => {
		const user = users.find((u) => u.id === userId);
		setSelectedUserId(userId);
		setSelectedUserName(user?.full_name || 'this user');
		setUnbanDialogOpen(true);
	};

	const handleBanConfirm = async () => {
		if (selectedUserId) {
			const result = await handleBan(selectedUserId);
			if (result.error) {
				toast.error(result.error);
			} else {
				toast.success(DICT.ADMIN.USERS.TOASTS.USER_BANNED);
			}
			setSelectedUserId(null);
			setSelectedUserName('');
		}
	};

	const handleUnbanConfirm = async () => {
		if (selectedUserId) {
			const result = await handleUnban(selectedUserId);
			if (result.error) {
				toast.error(result.error);
			} else {
				toast.success(DICT.ADMIN.USERS.TOASTS.USER_UNBANNED);
			}
			setSelectedUserId(null);
			setSelectedUserName('');
		}
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
					<StatIndicator variant="icon" className="text-blue-600">
						<Users />
					</StatIndicator>
					<StatValue>{totalCount}</StatValue>
					<StatLabel>Total Users</StatLabel>
				</Stat>
				<Stat>
					<StatIndicator variant="icon" className="text-green-600">
						<User />
					</StatIndicator>
					<StatValue>{onlineCount}</StatValue>
					<StatLabel>Online</StatLabel>
				</Stat>
				<Stat>
					<StatIndicator variant="icon" className="text-yellow-500">
						<ClockFading />
					</StatIndicator>
					<StatValue>{recentlyOnline}</StatValue>
					<StatLabel>Recently Online (7d)</StatLabel>
				</Stat>
				<Stat>
					<StatIndicator variant="icon" className="text-red-600">
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
				onPageChange={setPage}
				sortField={sortField}
				sortDirection={sortDirection}
				onSort={(field) =>
					handleSort(field as 'name' | 'email' | 'role' | 'status' | 'last_online' | 'joined')
				}
				onResetPassword={handleResetPasswordClick}
				onBan={handleBanClick}
				onUnban={handleUnbanClick}
			/>

			<InviteUserDialog
				open={isInviteModalOpen}
				onOpenChange={setIsInviteModalOpen}
				onInvite={handleInvite}
			/>

			<ConfirmActionDialog
				open={banDialogOpen}
				onOpenChange={setBanDialogOpen}
				title="Ban User"
				description={`Are you sure you want to ban ${selectedUserName || 'this user'}? They will no longer be able to sign in.`}
				confirmText="Ban User"
				onConfirm={handleBanConfirm}
				variant="destructive"
			/>

			<ConfirmActionDialog
				open={unbanDialogOpen}
				onOpenChange={setUnbanDialogOpen}
				title="Unban User"
				description={`Are you sure you want to unban ${selectedUserName || 'this user'}? They will be able to sign in again.`}
				confirmText="Unban User"
				onConfirm={handleUnbanConfirm}
			/>

			<ConfirmActionDialog
				open={resetPasswordDialogOpen}
				onOpenChange={setResetPasswordDialogOpen}
				title="Send password reset email?"
				description={`Are you sure you want to send a password reset email to ${selectedUserName || 'this user'}?`}
				confirmText="Send email"
				onConfirm={handleResetPasswordConfirm}
				variant="default"
			/>
		</main>
	);
}
