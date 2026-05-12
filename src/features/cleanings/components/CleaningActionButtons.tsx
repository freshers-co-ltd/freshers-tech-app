'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DICT } from '@/dictionary';
import type { UserRole } from '@/features/auth/authService';
import {
	CLEANING_STATUS,
	type CleaningStatus,
	STATUS_GROUPS,
} from '@/features/cleanings/cleaningService';

interface CleaningActionButtonsProps {
	userRole: UserRole;
	status: CleaningStatus;
	allTasksCompleted?: boolean;
	onClockIn?: () => void;
	onFinish?: () => void;
	onEdit?: (id: string) => void;
	onDelete?: (id: string) => void;
	cleaningId?: string;
	isClockInDisabled?: boolean;
	isFinishDisabled?: boolean;
}

export function CleaningActionButtons({
	userRole,
	status,
	allTasksCompleted = false,
	onClockIn,
	onFinish,
	onEdit,
	onDelete,
	cleaningId,
	isClockInDisabled = false,
	isFinishDisabled = true,
}: CleaningActionButtonsProps) {
	const isCleaner = userRole === 'cleaner';
	const isHost = userRole === 'host';

	const isConfirmed = status === CLEANING_STATUS.CONFIRMED;
	const isInProgress = status === CLEANING_STATUS.IN_PROGRESS;
	const canEdit = isHost && STATUS_GROUPS.CAN_EDIT.includes(status);
	const canCancel = isHost && STATUS_GROUPS.CAN_CANCEL.includes(status);

	if (isCleaner && (isConfirmed || isInProgress)) {
		return (
			<div className="p-4 border-t bg-background shrink-0">
				{isConfirmed && (
					<Button className="w-full  font-bold" onClick={onClockIn} disabled={isClockInDisabled}>
						Clock In
					</Button>
				)}
				{isInProgress && (
					<Button
						className="w-full font-bold"
						disabled={!allTasksCompleted || isFinishDisabled}
						onClick={onFinish}>
						{allTasksCompleted ? 'Finish & Submit Report' : 'Complete All Tasks to Finish'}
					</Button>
				)}
			</div>
		);
	}

	if (isHost && (canEdit || canCancel)) {
		return (
			<div className="p-3 border-t shrink-0">
				<div className="flex flex-col sm:flex-row gap-3">
					{canEdit && (
						<Button
							variant="outline"
							className="flex-1"
							onClick={() => cleaningId && onEdit?.(cleaningId)}>
							<Pencil className="mr-1 size-4" />
							{DICT.COMMON.ACTIONS.EDIT}
						</Button>
					)}
					{canCancel && (
						<Button
							variant="destructive"
							className="flex-1"
							onClick={() => cleaningId && onDelete?.(cleaningId)}>
							<Trash2 className="mr-1 size-4" />
							{status === CLEANING_STATUS.CONFIRMED
								? DICT.COMMON.ACTIONS.CANCEL_CLEANING
								: DICT.COMMON.ACTIONS.DELETE}
						</Button>
					)}
				</div>
			</div>
		);
	}

	return null;
}
