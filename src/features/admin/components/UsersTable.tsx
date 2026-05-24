'use client';

import { Eye, KeyRound, ShieldBan, ShieldCheck } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/DataTable';
import { EntityBadge } from '@/components/EntityBadge';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { AdminUser } from '@/features/admin/types';
import { formatDate } from '@/lib/utils';

export interface UsersTableProps {
	data: AdminUser[];
	loading?: boolean;
	page?: number;
	totalCount?: number;
	pageSize?: number;
	onPageChange?: (page: number) => void;
	sortField?: string;
	sortDirection?: 'asc' | 'desc';
	onSort?: (field: string) => void;
	onResetPassword?: (userId: string) => void;
	onBan?: (userId: string) => void;
	onUnban?: (userId: string) => void;
	allData?: AdminUser[];
	hasMore?: boolean;
	onLoadMore?: () => void;
	loadingMore?: boolean;
}

export function UsersTable({
	data,
	loading = false,
	page = 1,
	totalCount,
	pageSize = 20,
	onPageChange,
	sortField,
	sortDirection = 'asc',
	onSort,
	onResetPassword,
	onBan,
	onUnban,
	allData,
	hasMore,
	onLoadMore,
	loadingMore = false,
}: UsersTableProps) {
	const navigate = useNavigate();

	const getLastOnlineText = useCallback(
		(user: AdminUser) => user.last_sign_in_text || 'Unknown',
		[],
	);

	const columns = useMemo(() => {
		const cols: {
			key: string;
			label: string;
			sortable: boolean;
			className?: string;
			render?: (user: AdminUser) => React.ReactNode;
		}[] = [
			{
				key: 'name',
				label: 'Name',
				sortable: true,
				render: (user) => (
					<div className="flex items-center gap-2">
						<UserAvatar src={user.avatar_url} fallbackName={user.full_name} size="sm" />
						<span className="font-medium text-sm truncate">{user.full_name || 'Unknown'}</span>
					</div>
				),
			},
			{
				key: 'email',
				label: 'Email',
				sortable: true,
				render: (user) => <span className="text-sm truncate">{user.email}</span>,
			},
			{
				key: 'role',
				label: 'Role',
				sortable: true,
				className: 'text-center',
				render: (user) => <EntityBadge variant={{ type: 'role', value: user.role }} />,
			},
			{
				key: 'status',
				label: 'Status',
				sortable: true,
				className: 'text-center',
				render: (user) => (
					<EntityBadge
						variant={{
							type: 'userStatus',
							value: user.banned_until ? 'banned' : user.is_online ? 'online' : 'offline',
						}}
					/>
				),
			},
			{
				key: 'last_online',
				label: 'Last Online',
				sortable: true,
				render: (user) => <span className="text-sm">{getLastOnlineText(user)}</span>,
			},
			{
				key: 'joined',
				label: 'Joined',
				sortable: true,
				render: (user) => (
					<span className="text-sm">{user.created_at ? formatDate(user.created_at) : '-'}</span>
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
									onClick={() => onResetPassword?.(user.id)}>
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
										onClick={() => (user.banned_until ? onUnban?.(user.id) : onBan?.(user.id))}>
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

		return cols;
	}, [navigate, onResetPassword, onBan, onUnban, getLastOnlineText]);

	const renderMobileHeader = useCallback(
		(user: AdminUser) => (
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-2 min-w-0">
					<UserAvatar src={user.avatar_url} fallbackName={user.full_name} size="md" />

					<div className="min-w-0">
						<p className="font-medium truncate">{user.full_name || 'Unknown'}</p>
						<div className="flex gap-1 mt-0.5">
							<EntityBadge variant={{ type: 'role', value: user.role }} />
							<EntityBadge
								variant={{
									type: 'userStatus',
									value: user.banned_until ? 'banned' : user.is_online ? 'online' : 'offline',
								}}
							/>
						</div>
					</div>
				</div>

				<div className="flex gap-1 shrink-0">
					{user.role !== 'admin' && (
						<Button
							variant="secondary"
							size="sm"
							className="h-8 w-8 p-0"
							onClick={() =>
								navigate(`/admin/users/${user.role === 'host' ? 'hosts' : 'cleaners'}/${user.id}`)
							}>
							<Eye className="size-4" />
						</Button>
					)}
					<Button
						variant="secondary"
						size="sm"
						className="h-8 w-8 p-0"
						onClick={() => onResetPassword?.(user.id)}>
						<KeyRound className="size-4" />
					</Button>
					{user.role !== 'admin' && (
						<Button
							variant="secondary"
							size="sm"
							className="h-8 w-8 p-0"
							onClick={() => (user.banned_until ? onUnban?.(user.id) : onBan?.(user.id))}>
							{user.banned_until ? (
								<ShieldCheck className="size-4" />
							) : (
								<ShieldBan className="size-4" />
							)}
						</Button>
					)}
				</div>
			</div>
		),
		[navigate, onResetPassword, onBan, onUnban],
	);

	const priorityColumns = ['name', 'actions'];

	const excludeFromExpanded = ['name', 'role', 'status', 'actions'];

	return (
		<DataTable
			data={data}
			columns={columns}
			keyField="id"
			emptyMessage="No users found"
			loading={loading}
			page={page}
			totalCount={totalCount}
			pageSize={pageSize}
			onPageChange={onPageChange}
			sortField={sortField}
			sortDirection={sortDirection}
			onSort={onSort}
			renderMobileHeader={renderMobileHeader}
			priorityColumns={priorityColumns}
			excludeFromExpanded={excludeFromExpanded}
			allData={allData}
			hasMore={hasMore}
			onLoadMore={onLoadMore}
			loadingMore={loadingMore}
		/>
	);
}
