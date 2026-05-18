'use client';

import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { DICT } from '@/dictionary';

interface AdminActionDialogsProps {
	selectedUser: { id: string | null; name: string };
	banOpen: boolean;
	unbanOpen: boolean;
	resetPasswordOpen: boolean;
	onBanOpenChange: (open: boolean) => void;
	onUnbanOpenChange: (open: boolean) => void;
	onResetPasswordOpenChange: (open: boolean) => void;
	onConfirmBan: () => void;
	onConfirmUnban: () => void;
	onConfirmResetPassword: () => void;
}

export function AdminActionDialogs({
	selectedUser,
	banOpen,
	unbanOpen,
	resetPasswordOpen,
	onBanOpenChange,
	onUnbanOpenChange,
	onResetPasswordOpenChange,
	onConfirmBan,
	onConfirmUnban,
	onConfirmResetPassword,
}: AdminActionDialogsProps) {
	const dict = DICT.ADMIN.USERS;
	const userName = selectedUser.name || 'this user';

	return (
		<>
			<ConfirmActionDialog
				open={banOpen}
				onOpenChange={onBanOpenChange}
				title={dict.BAN_USER.TITLE}
				description={dict.BAN_USER.MESSAGE.replace('{name}', userName)}
				confirmText={dict.BAN_USER.BUTTON_SUBMIT}
				onConfirm={onConfirmBan}
				variant="destructive"
			/>

			<ConfirmActionDialog
				open={unbanOpen}
				onOpenChange={onUnbanOpenChange}
				title={dict.UNBAN_USER.TITLE}
				description={dict.UNBAN_USER.MESSAGE.replace('{name}', userName)}
				confirmText={dict.UNBAN_USER.BUTTON_SUBMIT}
				onConfirm={onConfirmUnban}
			/>

			<ConfirmActionDialog
				open={resetPasswordOpen}
				onOpenChange={onResetPasswordOpenChange}
				title={dict.PASSWORD_RESET.TITLE}
				description={dict.PASSWORD_RESET.MESSAGE.replace('{name}', userName)}
				confirmText={dict.PASSWORD_RESET.BUTTON_SUBMIT}
				onConfirm={onConfirmResetPassword}
			/>
		</>
	);
}
