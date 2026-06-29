'use client';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DICT } from '@/dictionary';

export interface ConfirmActionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	confirmText?: string;
	onConfirm: () => void;
	variant?: 'default' | 'destructive';
}

export function ConfirmActionDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmText = 'Confirm',
	onConfirm,
	variant = 'default',
}: ConfirmActionDialogProps) {
	const handleConfirm = () => {
		onConfirm();
		onOpenChange(false);
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="p-2">
					<AlertDialogCancel onClick={() => onOpenChange(false)}>
						{DICT.COMMON.ACTIONS.CANCEL}
					</AlertDialogCancel>
					<AlertDialogAction
						variant={variant === 'destructive' ? 'destructive' : 'default'}
						onClick={handleConfirm}>
						{confirmText}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
