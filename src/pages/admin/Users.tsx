'use client';

import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
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
type SortField = 'name' | 'email' | 'role' | 'status' | 'last_online' | 'joined';

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

	const SortIcon = ({ field }: { field: SortField }) => {
		if (sortField !== field) {
			return <ArrowUpDown className="ml-1 size-3" />;
		}
		return sortDirection === 'asc' ? (
			<ArrowUp className="ml-1 size-3" />
		) : (
			<ArrowDown className="ml-1 size-3" />
		);
	};

	const getLastOnlineText = (user: { last_sign_in_text?: string | null }) =>
		user.last_sign_in_text || 'Unknown';

	const renderActionButton = (
		action: 'view' | 'reset' | 'ban',
		user: { id: string; role: string; banned_until?: string | null },
	) => {
		const isView = action === 'view';
		const isReset = action === 'reset';
		const isBan = action === 'ban';

		const isDisabled = isView && user.role === 'admin';
		const label = isView
			? 'View Details'
			: isReset
				? 'Reset Password'
				: user.banned_until
					? 'Unban User'
					: 'Ban User';
		const variant = isBan ? (user.banned_until ? 'default' : 'destructive') : 'secondary';

		const handleClick = () => {
			if (isView) {
				navigate(`/admin/users/${user.role === 'host' ? 'hosts' : 'cleaners'}/${user.id}`);
			} else if (isReset) {
				handleResetPassword(user.id);
			} else if (user.banned_until) {
				handleUnban(user.id);
			} else {
				handleBan(user.id);
			}
		};

		const icon = isView ? (
			<Eye className="size-4" />
		) : isReset ? (
			<KeyRound className="size-4" />
		) : user.banned_until ? (
			<ShieldCheck className="size-4" />
		) : (
			<ShieldBan className="size-4" />
		);

		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<span>
						<Button
							variant={variant}
							size="sm"
							className="h-8 w-8 p-0"
							disabled={isDisabled}
							onClick={handleClick}>
							{icon}
						</Button>
					</span>
				</TooltipTrigger>
				<TooltipContent>
					<p>{label}</p>
				</TooltipContent>
			</Tooltip>
		);
	};

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

					<Card className="hidden md:block p-0 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-muted/50">
									<tr>
										<th className="text-left p-3 font-medium text-sm">
											<button
												type="button"
												className="flex items-center gap-1"
												onClick={() => handleSort('name')}>
												Name
												<SortIcon field="name" />
											</button>
										</th>
										<th className="text-left p-3 font-medium text-sm">
											<button
												type="button"
												className="flex items-center gap-1"
												onClick={() => handleSort('email')}>
												Email
												<SortIcon field="email" />
											</button>
										</th>
										<th className="text-center p-3 font-medium text-sm">
											<button
												type="button"
												className="flex items-center gap-1"
												onClick={() => handleSort('role')}>
												Role
												<SortIcon field="role" />
											</button>
										</th>
										<th className="text-center p-3 font-medium text-sm">
											<button
												type="button"
												className="flex items-center gap-1"
												onClick={() => handleSort('status')}>
												Status
												<SortIcon field="status" />
											</button>
										</th>
										<th className="text-left p-3 font-medium text-sm">
											<button
												type="button"
												className="flex items-center gap-1"
												onClick={() => handleSort('last_online')}>
												Last Online
												<SortIcon field="last_online" />
											</button>
										</th>
										<th className="text-left p-3 font-medium text-sm">
											<button
												type="button"
												className="flex items-center gap-1"
												onClick={() => handleSort('joined')}>
												Joined
												<SortIcon field="joined" />
											</button>
										</th>
										<th className="text-center p-3 font-medium text-sm">Actions</th>
									</tr>
								</thead>
								<tbody>
									{users.map((user) => (
										<tr key={user.id} className="border-t hover:bg-muted/30">
											<td className="p-3">
												<div className="flex items-center gap-2">
													<div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
														{user.avatar_url ? (
															<img
																src={user.avatar_url}
																alt=""
																className="size-8 rounded-full object-cover"
															/>
														) : (
															<User className="size-4 text-muted-foreground" />
														)}
													</div>
													<span className="font-medium text-sm truncate">
														{user.full_name || 'Unknown'}
													</span>
												</div>
											</td>
											<td className="p-3 text-sm text-muted-foreground truncate max-w-[200px]">
												{user.email}
											</td>
											<td className="p-3">
												<StatusBadge variant="role" value={user.role} />
											</td>
											<td className="p-3">
												<StatusBadge
													value={
														user.banned_until ? 'banned' : user.is_online ? 'online' : 'offline'
													}
												/>
											</td>
											<td className="p-3 text-sm">{getLastOnlineText(user)}</td>
											<td className="p-3 text-sm text-muted-foreground">
												{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
											</td>
											<td className="p-3 text-right">
												<div className="flex items-center justify-end gap-1">
													{renderActionButton('view', user)}
													{renderActionButton('reset', user)}
													{renderActionButton('ban', user)}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{users.length > 0 && (
							<div className="flex items-center justify-between p-4 border-t">
								<p className="text-sm text-muted-foreground">
									Showing {users.length} of {totalCount}
								</p>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										disabled={page === 1}
										onClick={() => setPage(page - 1)}>
										Previous
									</Button>
									<Button
										variant="outline"
										size="sm"
										disabled={page * 20 >= totalCount}
										onClick={() => setPage(page + 1)}>
										Next
									</Button>
								</div>
							</div>
						)}
					</Card>
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
