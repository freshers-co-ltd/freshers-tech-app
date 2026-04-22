import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/PageHeader';
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
	description: string;
	headerActions: ReactNode;
	isLoading: boolean;
	loadingMessage: string;
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
	description,
	headerActions,
	isLoading,
	loadingMessage,
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
		<main className="max-width-container">
			<PageHeader title={title} description={description} actions={headerActions} />

			<section className="mt-12">
				{isLoading ? (
					<div className="flex flex-col items-center justify-center min-h-100 space-y-4">
						<Loader2 className="size-8 animate-spin text-primary" />
						<p className="text-muted-foreground animate-pulse">{loadingMessage}</p>
					</div>
				) : hasResources ? (
					grid
				) : (
					emptyState
				)}
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
						<AlertDialogCancel>{DICT.COMMON.BACK}</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-white hover:bg-destructive/90"
							onClick={onDeleteConfirm}>
							{DICT.COMMON.DELETE}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</main>
	);
}
