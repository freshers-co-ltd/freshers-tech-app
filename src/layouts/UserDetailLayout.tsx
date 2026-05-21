'use client';

import type { LucideIcon } from 'lucide-react';
import { useCallback } from 'react';
import { Loading } from '@/components/Loading';
import { toast } from '@/components/Toast';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Stat, StatIndicator, StatLabel, StatValue } from '@/components/ui/stat';
import { DICT } from '@/dictionary';
import { AdminActionDialogs } from '@/features/admin/components/AdminActionDialogs';
import { UserCard } from '@/features/admin/components/UserCard';
import { useAdminActionDialogs } from '@/features/admin/useAdminActionDialogs';
import type { AdminUser } from '@/features/admin/userService';
import { cleaningService } from '@/features/cleanings/cleaningService';
import { CleaningDetailView } from '@/features/cleanings/components/CleaningDetailView';
import { useCleaningModals } from '@/hooks/useCleaningModals';

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
}: UserDetailLayoutProps) {
	const dict = DICT.ADMIN.USERS;
	const detail = DICT.ADMIN.USERS.DETAIL;

	const dialogs = useAdminActionDialogs();

	const fetchById = useCallback(async (id: string) => {
		const result = await cleaningService.getCleaningRequestById(id);
		return result.data || null;
	}, []);

	const { modal, viewingCleaning, isViewLoading } = useCleaningModals({
		fetchById,
		userRole: 'admin',
	});

	const isCleaner = userRole === 'cleaner';

	const handleResetPasswordClick = () => {
		if (onResetPassword) {
			dialogs.openResetPassword(user.id, user.full_name || '');
		}
	};

	const handleBan = () => {
		if (onBan) {
			dialogs.openBan(user.id, user.full_name || '');
		}
	};

	const handleUnban = () => {
		if (onUnban) {
			dialogs.openUnban(user.id, user.full_name || '');
		}
	};

	const handleBanConfirm = async () => {
		if (!onBan) {
			return;
		}
		const result = await onBan();
		if (result?.error) {
			toast.error(result.error || dict.BAN_USER.TOAST_ERROR);
		} else {
			toast.success(dict.BAN_USER.TOAST_SUCCESS);
		}
		dialogs.close();
	};

	const handleUnbanConfirm = async () => {
		if (!onUnban) {
			return;
		}
		const result = await onUnban();
		if (result?.error) {
			toast.error(result.error || dict.UNBAN_USER.TOAST_ERROR);
		} else {
			toast.success(dict.UNBAN_USER.TOAST_SUCCESS);
		}
		dialogs.close();
	};

	const handleResetPasswordConfirm = async () => {
		if (!onResetPassword) {
			return;
		}
		const result = await onResetPassword();
		if (result?.error) {
			toast.error(result.error || dict.PASSWORD_RESET.TOAST_ERROR);
		} else {
			toast.success(dict.PASSWORD_RESET.TOAST_SUCCESS);
		}
		dialogs.close();
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
				<Loading />
			</main>
		);
	}

	if (!user) {
		return null;
	}

	return (
		<main className="max-width-container py-8">
			<div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6">
				<Card className="flex-1 p-0 overflow-hidden">
					<UserCard
						user={user}
						onResetPassword={handleResetPasswordClick}
						onBan={handleBan}
						onUnban={handleUnban}
					/>
				</Card>

				<div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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

			<Dialog open={modal.isViewOpen} onOpenChange={(open) => !open && modal.handleClose()}>
				<DialogContent className="max-w-xl! w-screen sm:w-full h-[95svh] flex flex-col p-0 gap-0 overflow-hidden">
					{isViewLoading ? (
						<Loading />
					) : viewingCleaning ? (
						<CleaningDetailView
							cleaning={viewingCleaning}
							userRole="admin"
							onEdit={(id) => modal.openEdit(id)}
							onDelete={(id) => modal.setDeletingId(id)}
						/>
					) : null}
				</DialogContent>
			</Dialog>

			<AdminActionDialogs
				{...dialogs}
				onBanOpenChange={(o) => !o && dialogs.close()}
				onUnbanOpenChange={(o) => !o && dialogs.close()}
				onResetPasswordOpenChange={(o) => !o && dialogs.close()}
				onConfirmBan={handleBanConfirm}
				onConfirmUnban={handleUnbanConfirm}
				onConfirmResetPassword={handleResetPasswordConfirm}
			/>
		</main>
	);
}
