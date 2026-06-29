'use client';

import { useState } from 'react';

export type DialogType = 'ban' | 'unban' | 'resetPassword' | 'deleteUser' | null;

export function useAdminActionDialogs() {
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
	const [selectedUserName, setSelectedUserName] = useState('');
	const [activeDialog, setActiveDialog] = useState<DialogType>(null);

	const openBan = (userId: string, name: string) => {
		setSelectedUserId(userId);
		setSelectedUserName(name);
		setActiveDialog('ban');
	};

	const openUnban = (userId: string, name: string) => {
		setSelectedUserId(userId);
		setSelectedUserName(name);
		setActiveDialog('unban');
	};

	const openResetPassword = (userId: string, name: string) => {
		setSelectedUserId(userId);
		setSelectedUserName(name);
		setActiveDialog('resetPassword');
	};

	const openDeleteUser = (userId: string, name: string) => {
		setSelectedUserId(userId);
		setSelectedUserName(name);
		setActiveDialog('deleteUser');
	};

	const close = () => {
		setActiveDialog(null);
		setSelectedUserId(null);
		setSelectedUserName('');
	};

	return {
		selectedUser: { id: selectedUserId, name: selectedUserName } as const,
		banOpen: activeDialog === 'ban',
		unbanOpen: activeDialog === 'unban',
		resetPasswordOpen: activeDialog === 'resetPassword',
		deleteUserOpen: activeDialog === 'deleteUser',
		openBan,
		openUnban,
		openResetPassword,
		openDeleteUser,
		close,
	};
}
