'use client';

import { Loader2, Plus, Search, Shield, User, Users } from 'lucide-react';
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
import { analyticsService } from '@/features/admin/analyticsService';
import { type AdminUser, type UserFilters, userService } from '@/features/admin/userService';
import type { UserRole } from '@/features/auth/authService';

type UserTab = 'all' | 'host' | 'cleaner' | 'admin';

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
			userService.getUsers(filters, page, limit),
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
	}, [onlineTab, page, searchQuery]);

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

	const filteredUsers = users;

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

	const getActivityText = (user: AdminUser) => user.last_sign_in_text || 'Unknown';

	const getActivityColor = (user: AdminUser) => {
		if (user.last_sign_in_text === 'Today') {
			return 'text-green-600';
		}
		if (user.last_sign_in_text === 'This week') {
			return 'text-blue-600';
		}
		return 'text-muted-foreground';
	};

	const getStatusBadge = (user: AdminUser) => {
		if (user.banned_until) {
			return { label: 'Banned', className: 'bg-red-100 text-red-700' };
		}
		if (user.is_online) {
			return { label: 'Online', className: 'bg-green-100 text-green-700' };
		}
		return { label: 'Offline', className: 'bg-gray-100 text-gray-700' };
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
					<div className="flex flex-wrap gap-2">
						<Button
							variant={onlineTab === 'all' ? 'default' : 'outline'}
							size="sm"
							onClick={() => setOnlineTab('all')}>
							All
						</Button>
						<Button
							variant={onlineTab === 'host' ? 'default' : 'outline'}
							size="sm"
							onClick={() => setOnlineTab('host')}>
							Hosts
						</Button>
						<Button
							variant={onlineTab === 'cleaner' ? 'default' : 'outline'}
							size="sm"
							onClick={() => setOnlineTab('cleaner')}>
							Cleaners
						</Button>
						<Button
							variant={onlineTab === 'admin' ? 'default' : 'outline'}
							size="sm"
							onClick={() => setOnlineTab('admin')}>
							Admins
						</Button>
					</div>

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
						<Button onClick={() => setIsInviteModalOpen(true)}>
							<Plus className="size-4 mr-2" />
							<span className="sm:hidden">Invite</span>
							<span className="hidden sm:inline">Invite User</span>
						</Button>
					</div>
				</CardContent>
			</Card>

			{loading ? (
				<div className="flex items-center justify-center p-12">
					<Loader2 className="size-8 animate-spin text-muted-foreground" />
				</div>
			) : filteredUsers.length === 0 ? (
				<Card className="p-12 text-center">
					<p className="text-muted-foreground">No users found</p>
				</Card>
			) : (
				<div className="grid gap-4 md:hidden">
					{filteredUsers.map((user) => (
						<Card key={user.id} className="p-4">
							<div className="flex items-start justify-between mb-3">
								<div className="flex items-center gap-3">
									<div className="size-10 rounded-full bg-muted flex items-center justify-center">
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
									<div className="min-w-0">
										<p className="font-medium truncate">{user.full_name || 'Unknown'}</p>
										<p className="text-sm text-muted-foreground truncate">{user.email}</p>
									</div>
								</div>
								<span
									className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
									{user.role}
								</span>
							</div>

							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Last online:</span>
								<span className={getActivityColor(user)}>{getActivityText(user)}</span>
							</div>

							{user.role === 'host' &&
								user.total_properties !== undefined &&
								user.total_properties > 0 && (
									<div className="flex items-center justify-between text-sm mt-2">
										<span className="text-muted-foreground">Properties:</span>
										<span>{user.total_properties}</span>
									</div>
								)}

							{(user.role === 'host' || user.role === 'cleaner') &&
								user.total_cleanings !== undefined && (
									<div className="flex items-center justify-between text-sm mt-2">
										<span className="text-muted-foreground">Cleanings:</span>
										<span>{user.total_cleanings}</span>
									</div>
								)}

							<div className="flex gap-2 mt-4 pt-3 border-t">
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
			)}

			{!loading && filteredUsers.length > 0 && (
				<div className="hidden md:block">
					<Card className="p-0 pb-1 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-muted/50">
									<tr>
										<th className="text-center p-3 font-medium text-sm">User</th>
										<th className="text-center p-3 font-medium text-sm">Role</th>
										<th className="text-center p-3 font-medium text-sm">Status</th>
										<th className="text-center p-3 font-medium text-sm">Last Online</th>
										<th className="text-center p-3 font-medium text-sm">Joined</th>
										<th colSpan={3} className="text-center p-3 font-medium text-sm">
											Actions
										</th>
									</tr>
								</thead>
								<tbody>
									{filteredUsers.map((user) => (
										<tr key={user.id} className="border-t hover:bg-muted/30">
											<td className="p-3">
												<div className="flex items-center pl-6 gap-3">
													<div className="size-9 rounded-full bg-muted flex items-center justify-center shrink-0">
														{user.avatar_url ? (
															<img
																src={user.avatar_url}
																alt=""
																className="size-9 rounded-full object-cover"
															/>
														) : (
															<User className="size-4 text-muted-foreground" />
														)}
													</div>
													<div className="min-w-0">
														<p className="font-medium truncate text-sm">
															{user.full_name || 'Unknown'}
														</p>
														<p className="text-xs text-muted-foreground truncate">{user.email}</p>
													</div>
												</div>
											</td>
											<td className="p-3 text-center">
												<span
													className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
													{user.role}
												</span>
											</td>
											<td className="p-3 text-center">
												{(() => {
													const status = getStatusBadge(user);
													return (
														<span
															className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
															{status.label}
														</span>
													);
												})()}
											</td>
                                            <td className="p-3 text-center text-sm">
												{getActivityText(user)}
											</td>
											<td className="p-3 text-center text-sm">
												{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
											</td>
											<td className="p-1 text-center">
												{user.role !== 'admin' && (
													<Button
														variant="secondary"
														size="sm"
														className="h-8 px-2"
														onClick={() =>
															navigate(
																`/admin/users/${user.role === 'host' ? 'hosts' : 'cleaners'}/${user.id}`,
															)
														}>
														View
													</Button>
												)}
											</td>
											<td className="p-1 text-center">
												<Button
													variant="secondary"
													size="sm"
													className="h-8 px-2"
													onClick={() => handleResetPassword(user.id)}>
													Reset email
												</Button>
											</td>
											<td className="p-1 text-center">
												{user.role !== 'admin' &&
													(user.banned_until ? (
														<Button
															variant="default"
															size="sm"
															className="h-8 px-2"
															onClick={() => handleUnban(user.id)}>
															Unban
														</Button>
													) : (
														<Button
															variant="destructive"
															size="sm"
															className="h-8 px-2"
															onClick={() => handleBan(user.id)}>
															Ban
														</Button>
													))}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</Card>
				</div>
			)}

			{totalCount > limit && (
				<div className="flex items-center justify-between p-4">
					<p className="text-sm text-muted-foreground">
						Page {page} of {Math.ceil(totalCount / limit)}
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
