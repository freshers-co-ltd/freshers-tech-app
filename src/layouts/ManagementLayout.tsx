import type { ReactNode } from 'react';
import { Loading } from '@/components/Loading';
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
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormContainer } from '@/components/ui/form-container';
import { DICT } from '@/dictionary';

interface ManagementLayoutProps {
	title: string;
	headerActions: ReactNode;
	isLoading: boolean;
	hasResources: boolean;
	emptyState: ReactNode;
	grid: ReactNode;
	isViewOpen: boolean;
	isEditOrCreateOpen: boolean;
	onClose: () => void;
	viewContent: ReactNode;
	formContent: ReactNode;
	formTitle: string;
	formDescription: string;
	deletingId: string | null;
	onDeleteCancel: () => void;
	onDeleteConfirm: () => Promise<void>;
	deleteTitle: string;
	deleteMessage: string;
}

export function ManagementLayout({
	title,
	headerActions,
	isLoading,
	hasResources,
	emptyState,
	grid,
	isViewOpen,
	isEditOrCreateOpen,
	onClose,
	viewContent,
	formContent,
	formTitle,
	formDescription,
	deletingId,
	onDeleteCancel,
	onDeleteConfirm,
	deleteTitle,
	deleteMessage,
}: ManagementLayoutProps) {
	return (
		<main className="max-width-container p-2 md:p-8">
			<header className="mb-6 flex flex-col gap-8 md:flex-row md:justify-between">
				<div className="space-y-1">
					<h1 className="text-3xl font-bold uppercase text-center md:text-left">{title}</h1>
				</div>
				{headerActions}
			</header>

			<section className="mt-12">
				{isLoading ? <Loading /> : hasResources ? grid : emptyState}
			</section>

			<Dialog open={isViewOpen} onOpenChange={(open) => !open && onClose()}>
				{viewContent}
			</Dialog>

			<Dialog open={isEditOrCreateOpen} onOpenChange={(open) => !open && onClose()}>
				<DialogContent className="p-0 overflow-hidden max-w-2xl border-none">
					<FormContainer variant="dialog" title={formTitle} description={formDescription}>
						{formContent}
					</FormContainer>
				</DialogContent>
			</Dialog>

			<AlertDialog open={!!deletingId} onOpenChange={(open) => !open && onDeleteCancel()}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
						<AlertDialogDescription>{deleteMessage}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{DICT.COMMON.ACTIONS.BACK}</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-white hover:bg-destructive/90"
							onClick={onDeleteConfirm}>
							{DICT.COMMON.ACTIONS.DELETE}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</main>
	);
}
