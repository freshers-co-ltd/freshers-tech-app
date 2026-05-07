'use client';

import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { UserCard } from '@/components/UserCard';
import { Card } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Stat, StatIndicator, StatLabel, StatValue } from '@/components/ui/stat';
import { DICT } from '@/dictionary';
import type { AdminUser } from '@/features/admin/userService';
import type { CleaningRequest } from '@/features/cleanings/cleaningService';
import { cleaningService } from '@/features/cleanings/cleaningService';
import { CleaningDetailView } from '@/features/cleanings/components/CleaningDetailView';
import { useResourceModals } from '@/hooks/useResourceModals';

interface StatConfig {
	id?: string;
	label: string;
	value: string | number;
	icon: LucideIcon;
	iconColor?: string;
}

interface SectionConfig {
	id?: string;
	title: string;
	actionButton?: React.ReactNode;
	content: React.ReactNode;
}

interface UserDetailLayoutProps {
	user: AdminUser;
	userRole: 'cleaner' | 'host';
	isLoading?: boolean;
	stats?: StatConfig[];
	sections?: SectionConfig[];
	children?: React.ReactNode;
	onResetPassword?: () => Promise<{ error: string | null }>;
	onBan?: () => Promise<{ error: string | null }>;
	onUnban?: () => Promise<{ error: string | null }>;
	onEditBasePrice?: () => void;
}

export function UserDetailLayout({
	user,
	userRole,
	isLoading,
	stats,
	sections,
	children,
	onResetPassword,
	onBan,
	onUnban,
	onEditBasePrice,
}: UserDetailLayoutProps) {
	const dict = DICT.ADMIN.USERS;
	const detail = DICT.ADMIN.USERS.DETAIL;

	const cleaningModal = useResourceModals({ resourceName: 'cleaning' });
	const [viewingCleaning, setViewingCleaning] = useState<CleaningRequest | null>(null);
	const [viewingCleaningLoading, setViewingCleaningLoading] = useState(false);
	const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);

	const fetchViewingCleaning = useCallback(async () => {
		if (!cleaningModal.viewId) {
			return;
		}
		setViewingCleaningLoading(true);
		const result = await cleaningService.getCleaningRequestById(cleaningModal.viewId);
		if (!result.error && result.data) {
			setViewingCleaning(result.data);
		}
		setViewingCleaningLoading(false);
	}, [cleaningModal.viewId]);

	useEffect(() => {
		if (cleaningModal.isViewOpen && cleaningModal.viewId) {
			fetchViewingCleaning();
		} else {
			setViewingCleaning(null);
		}
	}, [cleaningModal.isViewOpen, cleaningModal.viewId, fetchViewingCleaning]);

	const isCleaner = userRole === 'cleaner';

	const handleResetPasswordClick = async () => {
		if (!onResetPassword) {
			return;
		}
		setResetPasswordDialogOpen(true);
	};

	const handleResetPasswordConfirm = async () => {
		if (!onResetPassword) {
			return;
		}
		const result = await onResetPassword();
		if (result?.error) {
			toast.error(result.error);
		} else {
			toast.success(dict.TOASTS.PASSWORD_RESET_SENT);
		}
	};

	const handleBan = async () => {
		if (!onBan) {
			return;
		}
		if (!window.confirm(dict.TOASTS.BAN_CONFIRM)) {
			return;
		}
		const result = await onBan();
		if (result?.error) {
			toast.error(result.error);
		} else {
			toast.success(dict.TOASTS.USER_BANNED);
		}
	};

	const handleUnban = async () => {
		if (!onUnban) {
			return;
		}
		if (!window.confirm(dict.TOASTS.UNBAN_CONFIRM)) {
			return;
		}
		const result = await onUnban();
		if (result?.error) {
			toast.error(result.error);
		} else {
			toast.success(dict.TOASTS.USER_UNBANNED);
		}
	};

	if (isLoading) {
		return (
			<main className="max-width-container">
				<header className="mb-6">
					<div className="space-y-1">
						<h1 className="text-2xl font-bold uppercase">
							{isCleaner ? detail.TITLE_CLEANER : detail.TITLE_HOST}
						</h1>
					</div>
				</header>
				<div className="flex items-center justify-center p-12">
					<Loader2 className="size-8 animate-spin text-muted-foreground" />
				</div>
			</main>
		);
	}

	if (!user) {
		return null;
	}

	return (
		<main className="max-width-container py-8">
			<div className="flex flex-col sm:flex-row gap-4 mb-6">
				<Card className="flex-1 p-0 overflow-hidden">
					<UserCard
						user={user}
						onResetPassword={handleResetPasswordClick}
						onBan={handleBan}
						onUnban={handleUnban}
						onEditBasePrice={onEditBasePrice}
					/>
				</Card>

				<div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
					{stats?.map((stat) => (
						<Stat key={stat.id || stat.label}>
							{stat.icon && (
								<StatIndicator variant="icon" iconColor={stat.iconColor}>
									<stat.icon />
								</StatIndicator>
							)}
							<StatValue>{stat.value}</StatValue>
							<StatLabel>{stat.label}</StatLabel>
						</Stat>
					))}
				</div>
			</div>

			{sections?.map((section) => (
				<div key={section.id || section.title}>
					<div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mt-6 mb-4">
						<h2 className="text-xl font-semibold">{section.title}</h2>
						{section.actionButton}
					</div>
					{section.content}
				</div>
			))}

			{children}

			<Dialog open={cleaningModal.isViewOpen} onOpenChange={() => cleaningModal.handleClose()}>
				<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Cleaning Details</DialogTitle>
						<DialogDescription>View complete cleaning information</DialogDescription>
					</DialogHeader>
					{viewingCleaningLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="size-6 animate-spin text-muted-foreground" />
						</div>
					) : viewingCleaning ? (
						<CleaningDetailView
							cleaning={viewingCleaning}
							userRole="admin"
							open={cleaningModal.isViewOpen}
							onOpenChange={(open) => !open && cleaningModal.handleClose()}
						/>
					) : null}
				</DialogContent>
			</Dialog>

			<ConfirmActionDialog
				open={resetPasswordDialogOpen}
				onOpenChange={setResetPasswordDialogOpen}
				title="Send password reset email?"
				description={dict.TOASTS.PASSWORD_RESET_CONFIRM}
				confirmText="Send email"
				onConfirm={handleResetPasswordConfirm}
			/>
		</main>
	);
}
