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
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
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
import { analyticsService } from '@/features/admin/analyticsService';
import { type AdminUser, type UserFilters, userService } from '@/features/admin/userService';
import type { UserRole } from '@/features/auth/authService';

type UserTab = 'all' | 'host' | 'cleaner' | 'admin';
type SortField = 'name' | 'email' | 'role' | 'status' | 'last_online' | 'joined';
type SortDirection = 'asc' | 'desc';

export function AdminUsersPage() {
	const navigate = useNavigate();
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [totalCount, setTotalCount] = useState(0);
	const [onlineCount, setOnlineCount] = useState(0);
	const [bannedCount, setBannedCount] = useState(0);
	const [recentlyOnline, setRecentlyOnline] = useState(0);
	const [onlineTab, setOnlineTab] = useState<UserTab>('all');
	const [searchQuery, setSearchQuery] = useState('');
	const [page, setPage] = useState(1);
	const limit = 20;
	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
	const [inviteEmail, setInviteEmail] = useState('');
	const [inviteFullName, setInviteFullName] = useState('');
	const [inviteRole, setInviteRole] = useState<UserRole>('host');
	const [inviting, setInviting] = useState(false);

	const [sortField, setSortField] = useState<SortField>('name');
	const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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
		} else if (statsResult.error) {
			console.error('Error fetching stats:', statsResult.error);
		}
	}, []);

	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	useEffect(() => {
		fetchCounts();
	}, [fetchCounts]);

	const handleInvite = async () => {
		if (!inviteEmail || !inviteFullName) {
			toast.error('Please fill in all fields');
			return;
		}
		setInviting(true);
		const result = await userService.inviteUser(inviteEmail, inviteRole, inviteFullName);
		setInviting(false);
		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success('Invitation sent successfully');
			setIsInviteModalOpen(false);
			setInviteEmail('');
			setInviteFullName('');
			fetchUsers();
		}
	};

	const handleResetPassword = async (userId: string) => {
		const result = await userService.resetPassword(userId);
		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success('Password reset email sent');
		}
	};

	const handleBan = async (userId: string) => {
		if (!window.confirm('Are you sure you want to ban this user?')) {
			return;
		}
		const result = await userService.banUser(userId);
		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success('User banned');
			fetchUsers();
		}
	};

	const handleUnban = async (userId: string) => {
		if (!window.confirm('Are you sure you want to unban this user?')) {
			return;
		}
		const result = await userService.unbanUser(userId);
		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success('User unbanned');
			fetchUsers();
		}
	};

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
		} else {
			setSortField(field);
			setSortDirection('asc');
		}
		setPage(1);
	};

	const getRoleBadgeColor = (role: string) => {
		switch (role) {
			case 'admin':
				return 'bg-yellow-100 text-yellow-700';
			case 'host':
				return 'bg-purple-100 text-purple-700';
			case 'cleaner':
				return 'bg-blue-100 text-blue-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	};

	const getLastOnlineText = (user: AdminUser) => user.last_sign_in_text || 'Unknown';

	const getStatusBadge = (user: AdminUser) => {
		if (user.banned_until) {
			return { label: 'Banned', className: 'bg-red-100 text-red-700' };
		}
		if (user.is_online) {
			return { label: 'Online', className: 'bg-green-100 text-green-700' };
		}
		return { label: 'Offline', className: 'bg-gray-100 text-gray-700' };
	};

	const SortIcon = ({ field }: { field: SortField }) => {
		if (sortField !== field) {
			return <ArrowUpDown className="ml-1 size-3 hover:cursor-pointer" />;
		}
		return sortDirection === 'asc' ? (
			<ArrowUp className="ml-1 size-3 hover:cursor-pointer" />
		) : (
			<ArrowDown className="ml-1 size-3 hover:cursor-pointer" />
		);
	};

	const renderActionButton = (action: 'view' | 'reset' | 'ban', user: AdminUser) => {
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
										fetchUsers();
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
						{users.map((user) => {
							const status = getStatusBadge(user);
							return (
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
											{
												label: 'Role',
												value: (
													<span
														className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold ${getRoleBadgeColor(user.role)}`}>
														{user.role}
													</span>
												),
											},
											{
												label: 'Status',
												value: (
													<span
														className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold ${status.className}`}>
														{status.label}
													</span>
												),
											},
											{ label: 'Last Online', value: getLastOnlineText(user) },
											{
												label: 'Joined',
												value: user.created_at
													? new Date(user.created_at).toLocaleDateString()
													: '-',
											},
										].map((item) => (
											<div
												key={item.label}
												className="grid grid-cols-[1fr_1.5fr] border-b last:border-0 text-sm">
												<div className="py-2  font-medium border-r">{item.label}</div>
												<div className="px-3 py-2 flex items-center justify-center">
													{item.value}
												</div>
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
							);
						})}
					</div>

					<Card className="hidden md:block p-0 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-muted/50">
									<tr>
										<th className="text-left p-3 font-medium text-sm">
											<button
												type="button"
												className="flex items-center gap-1 hover:text-foreground"
												onClick={() => handleSort('name')}>
												Name
												<SortIcon field="name" />
											</button>
										</th>
										<th className="text-left p-3 font-medium text-sm">
											<button
												type="button"
												className="flex items-center gap-1 hover:text-foreground"
												onClick={() => handleSort('email')}>
												Email
												<SortIcon field="email" />
											</button>
										</th>
										<th className="text-center p-3 font-medium text-sm">
											<button
												type="button"
												className="flex items-center gap-1 hover:text-foreground"
												onClick={() => handleSort('role')}>
												Role
												<SortIcon field="role" />
											</button>
										</th>
										<th className="text-center p-3 font-medium text-sm">
											<button
												type="button"
												className="flex items-center gap-1 hover:text-foreground"
												onClick={() => handleSort('status')}>
												Status
												<SortIcon field="status" />
											</button>
										</th>
										<th className="text-left p-3 font-medium text-sm">
											<button
												type="button"
												className="flex items-center gap-1 hover:text-foreground"
												onClick={() => handleSort('last_online')}>
												Last Online
												<SortIcon field="last_online" />
											</button>
										</th>
										<th className="text-left p-3 font-medium text-sm">
											<button
												type="button"
												className="flex items-center gap-1 hover:text-foreground"
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
											<td className="p-3 text">
												<span
													className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
													{user.role}
												</span>
											</td>
											<td className="p-3">
												<span
													className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(user).className}`}>
													{getStatusBadge(user).label}
												</span>
											</td>
											<td className="p-3 text-sm">
												<span className="">{getLastOnlineText(user)}</span>
											</td>
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

						{totalCount > limit && (
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
										disabled={page * limit >= totalCount}
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
							<Button onClick={handleInvite} disabled={inviting}>
								{inviting ? <Loader2 className="size-4 animate-spin" /> : 'Send Invite'}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</main>
	);
}
