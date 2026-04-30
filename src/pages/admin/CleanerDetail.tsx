'use client';

import { ArrowLeft, ArrowUp, Clock, KeyRound, Loader2, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DICT } from '@/dictionary';
import { type AdminCleanerDetail, userService } from '@/features/admin/userService';
import type { CleaningRequest } from '@/features/cleanings/cleaningService';
import { cleaningService } from '@/features/cleanings/cleaningService';
import { CleanerCleaningDetailView } from '@/features/cleanings/components/CleanerCleaningDetailView';
import { CleaningStatusBadge } from '@/features/cleanings/components/CleaningStatusBadge';
import { useResourceModals } from '@/hooks/useResourceModals';
import { AdminLayout } from '@/layouts/AdminLayout';

export function AdminCleanerDetailPage() {
	const d = DICT.ADMIN.USERS;
	const detail = DICT.ADMIN.USERS.DETAIL;
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [cleaner, setCleaner] = useState<AdminCleanerDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [viewingCleaning, setViewingCleaning] = useState<CleaningRequest | null>(null);
	const [viewingLoading, setViewingLoading] = useState(false);

	const modal = useResourceModals({ resourceName: 'cleaning' });

	const fetchViewingCleaning = useCallback(async () => {
		if (!modal.viewId) {
			return;
		}
		setViewingLoading(true);
		const result = await cleaningService.getCleaningRequestById(modal.viewId);
		if (!result.error && result.data) {
			setViewingCleaning(result.data);
		}
		setViewingLoading(false);
	}, [modal.viewId]);

	useEffect(() => {
		if (modal.isViewOpen && modal.viewId) {
			fetchViewingCleaning();
		} else {
			setViewingCleaning(null);
		}
	}, [modal.isViewOpen, modal.viewId, fetchViewingCleaning]);

	const fetchCleanerDetail = useCallback(async () => {
		if (!id) {
			return;
		}
		setLoading(true);
		const result = await userService.getCleanerDetail(id);
		if (result.error) {
			toast.error(result.error);
			navigate('/admin/users');
		} else {
			setCleaner(result.data as AdminCleanerDetail | null);
		}
		setLoading(false);
	}, [id, navigate]);

	useEffect(() => {
		fetchCleanerDetail();
	}, [fetchCleanerDetail]);

	const handleResetPassword = async () => {
		if (!cleaner) {
			return;
		}
		const result = await userService.resetPassword(cleaner.id);
		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success(d.TOASTS.PASSWORD_RESET_SENT);
		}
	};

	const handleBan = async () => {
		if (!cleaner) {
			return;
		}
		if (!window.confirm(d.TOASTS.BAN_CONFIRM)) {
			return;
		}
		const result = await userService.banUser(cleaner.id);
		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success(d.TOASTS.USER_BANNED);
			fetchCleanerDetail();
		}
	};

	const handleUnban = async () => {
		if (!cleaner) {
			return;
		}
		if (!window.confirm(d.TOASTS.UNBAN_CONFIRM)) {
			return;
		}
		const result = await userService.unbanUser(cleaner.id);
		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success(d.TOASTS.USER_UNBANNED);
			fetchCleanerDetail();
		}
	};

	if (loading) {
		return (
			<AdminLayout title={detail.TITLE}>
				<div className="max-width-container">
					<div className="flex items-center justify-center p-8">
						<Loader2 className="size-8 animate-spin text-muted-foreground" />
					</div>
				</div>
			</AdminLayout>
		);
	}
	if (!cleaner) {
		return null;
	}

	const cleanings = cleaner.assigned_cleanings || [];
	const stats = cleaner.cleaner_stats;

	return (
		<AdminLayout title={detail.TITLE} stats={[]}>
			<main className="max-width-container">
				<div className="flex items-center justify-between mb-4">
					<Button variant="ghost" onClick={() => navigate('/admin/users')}>
						<ArrowLeft className="size-4 mr-2" />
						Back
					</Button>
					<div className="flex gap-2">
						<Tooltip>
							<TooltipTrigger asChild>
								<span>
									<Button variant="outline" size="sm" onClick={handleResetPassword}>
										<KeyRound className="size-4 mr-2" />
										Reset Password
									</Button>
								</span>
							</TooltipTrigger>
							<TooltipContent>
								<p>Send password reset email</p>
							</TooltipContent>
						</Tooltip>
						{cleaner.banned_until ? (
							<Button variant="outline" size="sm" onClick={handleUnban}>
								<ArrowUp className="size-4 mr-2" />
								Unban
							</Button>
						) : (
							<Button variant="destructive" size="sm" onClick={handleBan}>
								<ArrowUp className="size-4 mr-2" />
								Ban
							</Button>
						)}
					</div>
				</div>

				<PageHeader title={cleaner.full_name || detail.TITLE} description={cleaner.email || ''} />

				<div className="grid gap-4 md:grid-cols-2 mb-6">
					<Card className="p-4">
						<div className="flex items-center gap-3">
							<div className="size-12 rounded-full bg-muted flex items-center justify-center shrink-0">
								{cleaner.avatar_url ? (
									<img
										src={cleaner.avatar_url}
										alt=""
										className="size-full rounded-full object-cover"
									/>
								) : (
									<User className="size-5 text-muted-foreground" />
								)}
							</div>
							<div className="flex-1 min-w-0">
								<p className="font-semibold truncate">{cleaner.full_name || detail.UNKNOWN}</p>
								<p className="text-sm text-muted-foreground truncate">{cleaner.email}</p>
								<div className="flex items-center gap-2 mt-1">
									<span
										className={`px-2 py-0.5 rounded-full text-xs font-medium ${
											cleaner.banned_until
												? 'bg-red-100 text-red-700'
												: 'bg-green-100 text-green-700'
										}`}>
										{cleaner.banned_until ? detail.STATUS_BANNED : detail.STATUS_ACTIVE}
									</span>
									{cleaner.is_verified && (
										<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
											Verified
										</span>
									)}
								</div>
							</div>
						</div>
					</Card>
					<Card className="p-4">
						<div className="grid grid-cols-4 gap-3 text-center">
							<div>
								<p className="text-xl font-bold">{stats?.total_assigned || 0}</p>
								<p className="text-xs text-muted-foreground">Total</p>
							</div>
							<div>
								<p className="text-xl font-bold text-green-600">{stats?.completed || 0}</p>
								<p className="text-xs text-muted-foreground">Completed</p>
							</div>
							<div>
								<p className="text-xl font-bold text-blue-600">{stats?.in_progress || 0}</p>
								<p className="text-xs text-muted-foreground">In Progress</p>
							</div>
							<div>
								<p className="text-xl font-bold">
									{DICT.FORMAT.CURRENCY}
									{stats?.total_earnings?.toFixed(0) || '0'}
								</p>
								<p className="text-xs text-muted-foreground">Earned</p>
							</div>
						</div>
						{stats?.avg_completion_hours !== null && stats.avg_completion_hours > 0 && (
							<div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t">
								<Clock className="size-3.5 text-muted-foreground" />
								<span className="text-xs text-muted-foreground">
									Avg: {stats.avg_completion_hours.toFixed(1)}h
								</span>
							</div>
						)}
					</Card>
				</div>

				<Card>
					<div className="flex items-center justify-between p-4 border-b">
						<h3 className="font-semibold">Assigned Cleanings</h3>
						<span className="text-sm text-muted-foreground">
							{cleanings.length} {cleanings.length === 1 ? 'cleaning' : 'cleanings'}
						</span>
					</div>
					{cleanings.length === 0 ? (
						<p className="p-4 text-sm text-muted-foreground">No cleanings assigned</p>
					) : (
						<div className="divide-y">
							{cleanings.map((cleaning) => (
								<button
									type="button"
									key={cleaning.id}
									className="flex items-center gap-3 p-3 w-full text-left hover:bg-muted/50 cursor-pointer"
									onClick={() => modal.openView(cleaning.id)}>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">
											{cleaning.property_address || detail.UNKNOWN}
										</p>
										<p className="text-xs text-muted-foreground">
											{new Date(cleaning.scheduled_start).toLocaleDateString()} ·{' '}
											{cleaning.host_name || detail.UNKNOWN}
										</p>
									</div>
									<CleaningStatusBadge status={cleaning.status} />
									<p className="text-sm font-medium">
										{DICT.FORMAT.CURRENCY}
										{cleaning.service_cost}
									</p>
								</button>
							))}
						</div>
					)}
				</Card>

				<Dialog open={modal.isViewOpen} onOpenChange={() => modal.handleClose()}>
					<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>Cleaning Details</DialogTitle>
							<DialogDescription>View complete cleaning information</DialogDescription>
						</DialogHeader>
						{viewingLoading ? (
							<div className="flex items-center justify-center py-8">
								<Loader2 className="size-6 animate-spin text-muted-foreground" />
							</div>
						) : viewingCleaning ? (
							<CleanerCleaningDetailView
								cleaning={viewingCleaning}
								open={modal.isViewOpen}
								onOpenChange={(open) => !open && modal.handleClose()}
							/>
						) : null}
					</DialogContent>
				</Dialog>
			</main>
		</AdminLayout>
	);
}
