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

	const currentCleaner = availableCleaners.find((c) => c.id === selectedCleanerId);
	const displayValue = currentCleaner?.full_name || '';

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{DICT.CLEANINGS.ASSIGN_CLEANER.TITLE}</DialogTitle>
					<DialogDescription>Select which cleaner to assign</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<Select value={selectedCleanerId} onValueChange={onSelectCleaner}>
						<SelectTrigger className="w-full" aria-label={DICT.CLEANINGS.ASSIGN_CLEANER.SELECT}>
							<SelectValue
								placeholder={DICT.CLEANINGS.ASSIGN_CLEANER.SELECT}
								className={displayValue ? 'text-foreground' : ''}>
								{displayValue || DICT.CLEANINGS.ASSIGN_CLEANER.SELECT}
							</SelectValue>
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
