'use client';

import {
	Eye,
	KeyRound,
	Loader2,
	Plus,
	Search,
	Shield,
	ShieldBan,
	ShieldCheck,
	User,
	Users,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type ColumnDef, DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAdminUsers } from '@/features/admin/useAdminUsers';
import type { UserRole } from '@/features/auth/authService';

type UserTab = 'all' | 'host' | 'cleaner' | 'admin';

export function AdminUsersPage() {
	const navigate = useNavigate();
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
	const [inviteEmail, setInviteEmail] = useState('');
	const [inviteFullName, setInviteFullName] = useState('');
	const [inviteRole, setInviteRole] = useState<UserRole>('host');
	const [inviting, setInviting] = useState(false);

	const handleInviteSubmit = async () => {
		if (!inviteEmail || !inviteFullName) {
			return;
		}
		setInviting(true);
		await handleInvite(inviteEmail, inviteRole, inviteFullName);
		setInviting(false);
		setIsInviteModalOpen(false);
		setInviteEmail('');
		setInviteFullName('');
	};

	const getLastOnlineText = (user: { last_sign_in_text?: string | null }) =>
		user.last_sign_in_text || 'Unknown';

	const userColumns: ColumnDef<(typeof users)[0]>[] = [
		{
			key: 'name',
			label: 'Name',
			sortable: true,
			render: (user) => (
				<div className="flex items-center gap-2">
					<div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
						{user.avatar_url ? (
							<img src={user.avatar_url} alt="" className="size-8 rounded-full object-cover" />
						) : (
							<User className="size-4 text-muted-foreground" />
						)}
					</div>
					<span className="font-medium text-sm truncate">{user.full_name || 'Unknown'}</span>
				</div>
			),
		},
		{
			key: 'email',
			label: 'Email',
			sortable: true,
			render: (user) => (
				<span className="text-sm text-muted-foreground truncate max-w-[200px]">{user.email}</span>
			),
		},
		{
			key: 'role',
			label: 'Role',
			sortable: true,
			className: 'text-center',
			render: (user) => <StatusBadge variant="role" value={user.role} />,
		},
		{
			key: 'status',
			label: 'Status',
			sortable: true,
			className: 'text-center',
			render: (user) => (
				<StatusBadge value={user.banned_until ? 'banned' : user.is_online ? 'online' : 'offline'} />
			),
		},
		{
			key: 'last_online',
			label: 'Last Online',
			sortable: true,
			render: (user) => (
				<span className="text-sm text-muted-foreground">{getLastOnlineText(user)}</span>
			),
		},
		{
			key: 'joined',
			label: 'Joined',
			sortable: true,
			render: (user) => (
				<span className="text-sm text-muted-foreground">
					{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
				</span>
			),
		},
		{
			key: 'actions',
			label: 'Actions',
			sortable: false,
			className: 'text-center',
			render: (user) => (
				<div className="flex items-center justify-center gap-1">
					{user.role !== 'admin' && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="secondary"
									size="sm"
									className="h-8 w-8 p-0"
									onClick={() =>
										navigate(
											`/admin/users/${user.role === 'host' ? 'hosts' : 'cleaners'}/${user.id}`,
										)
									}>
									<Eye className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>View Details</p>
							</TooltipContent>
						</Tooltip>
					)}
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="secondary"
								size="sm"
								className="h-8 w-8 p-0"
								onClick={() => handleResetPassword(user.id)}>
								<KeyRound className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Reset Password</p>
						</TooltipContent>
					</Tooltip>
					{user.role !== 'admin' && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="secondary"
									size="sm"
									className="h-8 w-8 p-0"
									onClick={() => (user.banned_until ? handleUnban(user.id) : handleBan(user.id))}>
									{user.banned_until ? (
										<ShieldCheck className="size-4" />
									) : (
										<ShieldBan className="size-4" />
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>{user.banned_until ? 'Unban User' : 'Ban User'}</p>
							</TooltipContent>
						</Tooltip>
					)}
				</div>
			),
		},
	];

	const renderMobileCard = (user: (typeof users)[0]) => (
		<>
			<div className="flex items-center gap-3 mb-3">
				<div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
					{user.avatar_url ? (
						<img src={user.avatar_url} alt="" className="size-full rounded-full object-cover" />
					) : (
						<User className="size-5 text-muted-foreground" />
					)}
				</div>
				<div className="min-w-0 flex-1">
					<p className="font-medium truncate">{user.full_name || 'Unknown'}</p>
					<p className="text-sm text-muted-foreground truncate">{user.email}</p>
				</div>
			</div>
			<div className="flex flex-col gap-2 text-sm">
				<div className="grid grid-cols-[1fr_1.5fr] border-b py-2">
					<span className="font-medium">Role</span>
					<StatusBadge variant="role" value={user.role} />
				</div>
				<div className="grid grid-cols-[1fr_1.5fr] border-b py-2">
					<span className="font-medium">Status</span>
					<StatusBadge
						value={user.banned_until ? 'banned' : user.is_online ? 'online' : 'offline'}
					/>
				</div>
				<div className="grid grid-cols-[1fr_1.5fr] py-2">
					<span className="font-medium">Last Online</span>
					<span className="text-muted-foreground">{getLastOnlineText(user)}</span>
				</div>
			</div>
		</>
	);

	return (
		<main className="max-width-container">
			<PageHeader title="User Management" description="Manage platform users" />

			<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
				<Card className="p-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-primary/10 rounded-lg">
							<Users className="size-5 text-primary" />
						</div>
						<div>
							<p className="text-2xl font-bold">{totalCount}</p>
							<p className="text-xs text-muted-foreground">Total Users</p>
						</div>
					</div>
				</Card>
				<Card className="p-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-green-100 rounded-lg">
							<Shield className="size-5 text-green-600" />
						</div>
						<div>
							<p className="text-2xl font-bold">{onlineCount}</p>
							<p className="text-xs text-muted-foreground">Online</p>
						</div>
					</div>
				</Card>
				<Card className="p-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-blue-100 rounded-lg">
							<User className="size-5 text-blue-600" />
						</div>
						<div>
							<p className="text-2xl font-bold">{recentlyOnline}</p>
							<p className="text-xs text-muted-foreground">Recently Online (7d)</p>
						</div>
					</div>
				</Card>
				<Card className="p-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-red-100 rounded-lg">
							<Shield className="size-5 text-red-600" />
						</div>
						<div>
							<p className="text-2xl font-bold">{bannedCount}</p>
							<p className="text-xs text-muted-foreground">Banned</p>
						</div>
					</div>
				</Card>
			</div>

			<Card className="mb-4 py-1">
				<CardContent className="p-4 space-y-4">
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
								className="pl-9"
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
						<Button onClick={() => setIsInviteModalOpen(true)}>
							<Plus className="size-4 mr-2" />
							<span className="sm:hidden">Invite</span>
							<span className="hidden sm:inline">Invite User</span>
						</Button>
					</div>
				</CardContent>
			</Card>

			{loading ? (
				<Card className="p-12 text-center">
					<Loader2 className="size-8 animate-spin text-muted-foreground mx-auto" />
				</Card>
			) : users.length === 0 ? (
				<Card className="p-12 text-center">
					<p className="text-muted-foreground">No users found</p>
				</Card>
			) : (
				<>
					<div className="grid gap-4 md:hidden">
						{users.map((user) => (
							<Card key={user.id} className="p-4 gap-3">
								<div className="flex items-center gap-3">
									<div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
										{user.avatar_url ? (
											<img
												src={user.avatar_url}
												alt=""
												className="size-10 rounded-full object-cover"
											/>
										) : (
											<User className="size-5 text-muted-foreground" />
										)}
									</div>
									<div className="min-w-0 flex-1">
										<p className="font-medium truncate">{user.full_name || 'Unknown'}</p>
										<p className="text-sm text-muted-foreground truncate">{user.email}</p>
									</div>
								</div>

								<div className="flex flex-col">
									{[
										{ label: 'Role', value: <StatusBadge variant="role" value={user.role} /> },
										{
											label: 'Status',
											value: (
												<StatusBadge
													value={
														user.banned_until ? 'banned' : user.is_online ? 'online' : 'offline'
													}
												/>
											),
										},
										{ label: 'Last Online', value: getLastOnlineText(user) },
										{
											label: 'Joined',
											value: user.created_at ? new Date(user.created_at).toLocaleDateString() : '-',
										},
									].map((item) => (
										<div
											key={item.label}
											className="grid grid-cols-[1fr_1.5fr] border-b last:border-0 text-sm">
											<div className="py-2 font-medium border-r">{item.label}</div>
											<div className="px-3 py-2 flex items-center justify-center">{item.value}</div>
										</div>
									))}
								</div>

								<div className="flex gap-2 pt-3 border-t">
									{user.role !== 'admin' && (
										<Button
											variant="outline"
											size="sm"
											className="flex-1"
											onClick={() =>
												navigate(
													`/admin/users/${user.role === 'host' ? 'hosts' : 'cleaners'}/${user.id}`,
												)
											}>
											View
										</Button>
									)}
									<Button
										variant="outline"
										size="sm"
										className="flex-1"
										onClick={() => handleResetPassword(user.id)}>
										Reset
									</Button>
									{user.role !== 'admin' &&
										(user.banned_until ? (
											<Button
												variant="default"
												size="sm"
												className="flex-1"
												onClick={() => handleUnban(user.id)}>
												Unban
											</Button>
										) : (
											<Button
												variant="destructive"
												size="sm"
												className="flex-1"
												onClick={() => handleBan(user.id)}>
												Ban
											</Button>
										))}
								</div>
							</Card>
						))}
					</div>

					<DataTable
						data={users}
						columns={userColumns}
						loading={loading}
						emptyMessage="No users found"
						sortField={sortField}
						sortDirection={sortDirection}
						onSort={(field) =>
							handleSort(field as 'name' | 'email' | 'role' | 'status' | 'last_online' | 'joined')
						}
						page={page}
						totalCount={totalCount}
						pageSize={20}
						onPageChange={setPage}
						keyField="id"
						renderMobileCard={renderMobileCard}
					/>
				</>
			)}

			<Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Invite New User</DialogTitle>
						<DialogDescription>Send an invitation to a new user</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<span className="text-sm font-medium block mb-2">Email</span>
							<Input
								id="invite-email"
								type="email"
								value={inviteEmail}
								onChange={(e) => setInviteEmail(e.target.value)}
								placeholder="email@example.com"
							/>
						</div>
						<div>
							<span className="text-sm font-medium block mb-2">Full Name</span>
							<Input
								id="invite-name"
								value={inviteFullName}
								onChange={(e) => setInviteFullName(e.target.value)}
								placeholder="John Smith"
							/>
						</div>
						<div>
							<span className="text-sm font-medium block mb-2">Role</span>
							<Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="host">Host</SelectItem>
									<SelectItem value="cleaner">Cleaner</SelectItem>
									<SelectItem value="admin">Admin</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>
								Cancel
							</Button>
							<Button onClick={handleInviteSubmit} disabled={inviting}>
								{inviting ? <Loader2 className="size-4 animate-spin" /> : 'Send Invite'}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</main>
	);
}
