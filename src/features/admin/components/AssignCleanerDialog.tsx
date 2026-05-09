'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { DICT } from '@/dictionary';

export interface AssignCleanerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	availableCleaners: { id: string; full_name: string | null }[];
	selectedCleanerId: string;
	onSelectCleaner: (id: string) => void;
	onAssign: () => void;
	onCancel?: () => void;
}

export function AssignCleanerDialog({
	open,
	onOpenChange,
	availableCleaners,
	selectedCleanerId,
	onSelectCleaner,
	onAssign,
	onCancel,
}: AssignCleanerDialogProps) {
	const handleCancel = () => {
		if (onCancel) {
			onCancel();
		}
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{DICT.COMMON.DIALOGS.ASSIGN_CLEANER.TITLE}</DialogTitle>
					<DialogDescription>Select which cleaner to assign</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<Select value={selectedCleanerId} onValueChange={onSelectCleaner}>
						<SelectTrigger>
							<SelectValue placeholder={DICT.COMMON.DIALOGS.ASSIGN_CLEANER.SELECT} />
						</SelectTrigger>
						<SelectContent emptyMessage="No available cleaners">
							{availableCleaners.map((cleaner) => (
								<SelectItem key={cleaner.id} value={cleaner.id}>
									{cleaner.full_name || 'Unknown'}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={handleCancel}>
							{DICT.COMMON.ACTIONS.CANCEL}
						</Button>
						<Button onClick={onAssign}>{DICT.COMMON.ACTIONS.ASSIGN_CLEANER}</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
