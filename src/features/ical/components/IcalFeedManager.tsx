'use client';

import { formatDistanceToNow } from 'date-fns';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { DICT } from '@/dictionary';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import { IcalFeedForm } from '@/features/ical/components/IcalFeedForm';
import { useIcalFeeds } from '@/features/ical/hooks/useIcalFeeds';
import { useIcalFeedsRealtime } from '@/features/ical/hooks/useIcalFeedsRealtime';
import type {
	CreateFeedPayload,
	IcalFeed,
	IcalSource,
	UpdateFeedPayload,
} from '@/features/ical/types';
import { cn } from '@/lib/utils';

interface IcalFeedManagerProps {
	propertyId: string;
}

const formatLastSynced = (iso: string | null): string => {
	if (!iso) {
		return DICT.ICAL.NEVER_SYNCED;
	}
	return DICT.ICAL.LAST_SYNCED.replace(
		'{time}',
		formatDistanceToNow(new Date(iso), { addSuffix: true }),
	);
};

export function IcalFeedManager({ propertyId }: IcalFeedManagerProps) {
	const { fetchCleanings } = useCleanings();
	const {
		feeds,
		isLoading,
		isSyncingId,
		isDeletingId,
		createFeed,
		deleteFeed,
		syncFeed,
		updateFeed,
		refreshFeeds,
	} = useIcalFeeds(propertyId, fetchCleanings);

	useIcalFeedsRealtime({ propertyId, onFeedChange: refreshFeeds });

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingFeed, setEditingFeed] = useState<IcalFeed | null>(null);
	const [isEditFormOpen, setIsEditFormOpen] = useState(false);
	const [deletingFeed, setDeletingFeed] = useState<IcalFeed | null>(null);
	const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
	const [cancelCleanings, setCancelCleanings] = useState(false);

	const handleFormSubmit = async (payload: CreateFeedPayload | UpdateFeedPayload) => {
		const result = await createFeed(payload as CreateFeedPayload);
		if (result.success) {
			setIsFormOpen(false);
		}
		return result;
	};

	const openEditForm = (feed: IcalFeed) => {
		setEditingFeed(feed);
		setIsEditFormOpen(true);
	};

	const handleEditSubmit = async (payload: CreateFeedPayload | UpdateFeedPayload) => {
		if (!editingFeed) {
			return { success: false };
		}
		const result = await updateFeed({ ...payload, feedId: editingFeed.id } as UpdateFeedPayload);
		if (result.success) {
			setIsEditFormOpen(false);
			setEditingFeed(null);
		}
		return result;
	};

	const openDeleteConfirm = (feed: IcalFeed) => {
		setDeletingFeed(feed);
		setCancelCleanings(false);
		setIsDeleteConfirmOpen(true);
	};

	const handleDeleteConfirm = () => {
		if (!deletingFeed) {
			return;
		}
		void deleteFeed({ feedId: deletingFeed.id, cancelCleanings }).then((result) => {
			if (result.success) {
				setDeletingFeed(null);
				setIsDeleteConfirmOpen(false);
			}
		});
	};

	if (isLoading) {
		return <Loading absolute={false} />;
	}

	return (
		<div className="space-y-3">
			{feeds.map((feed) => {
				const isSyncing = isSyncingId === feed.id;
				const statusText = (() => {
					if (isSyncing) {
						return DICT.ICAL.SYNCING;
					}
					if (feed.last_sync_error) {
						return `${DICT.ICAL.SYNC_ERROR}: ${feed.last_sync_error}`;
					}
					return formatLastSynced(feed.last_synced_at);
				})();
				const isError = !isSyncing && !!feed.last_sync_error;
				return (
					<div key={feed.id} className="flex flex-col gap-2 border rounded-lg p-3">
						<p className="text-sm text-muted-foreground break-all">{feed.url_display}</p>
						<div className="flex items-center justify-between gap-2">
							<span
								className={cn('text-xs', isError ? 'text-destructive' : 'text-muted-foreground')}>
								{statusText}
							</span>
							<div className="flex items-center gap-1 shrink-0">
								<Button
									size="icon-sm"
									variant="secondary"
									aria-label={DICT.ICAL.SYNC_NOW}
									onClick={() => syncFeed(feed.id)}
									disabled={isSyncing}>
									<RefreshCw className={cn('size-4', isSyncing && 'animate-spin')} />
								</Button>
								<Button
									size="icon-sm"
									variant="secondary"
									aria-label={DICT.COMMON.ACTIONS.EDIT}
									onClick={() => openEditForm(feed)}>
									<Pencil className="size-4" />
								</Button>
								<Button
									size="icon-sm"
									variant="destructive"
									aria-label={DICT.COMMON.ACTIONS.DELETE}
									onClick={() => openDeleteConfirm(feed)}>
									<Trash2 className="size-4" />
								</Button>
							</div>
						</div>
					</div>
				);
			})}

			{feeds.length === 0 && !isFormOpen && (
				<p className="text-sm text-muted-foreground">{DICT.ICAL.EMPTY}</p>
			)}

			<Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>{DICT.ICAL.CREATE.TITLE}</DialogTitle>
						<DialogDescription>{DICT.ICAL.CREATE.MESSAGE}</DialogDescription>
					</DialogHeader>
					<IcalFeedForm
						propertyId={propertyId}
						onSubmit={handleFormSubmit}
						onCancel={() => setIsFormOpen(false)}
					/>
				</DialogContent>
			</Dialog>

			<Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>{DICT.ICAL.UPDATE.TITLE}</DialogTitle>
						<DialogDescription>{DICT.ICAL.UPDATE.MESSAGE}</DialogDescription>
					</DialogHeader>
					{editingFeed && (
						<IcalFeedForm
							propertyId={propertyId}
							initialValues={{ url: '', source: editingFeed.source as IcalSource }}
							onSubmit={handleEditSubmit}
							onCancel={() => {
								setIsEditFormOpen(false);
								setEditingFeed(null);
							}}
						/>
					)}
				</DialogContent>
			</Dialog>

			<Button variant="outline" className="w-full" onClick={() => setIsFormOpen(true)}>
				<Plus className="size-4" /> {DICT.ICAL.ADD}
			</Button>

			<AlertDialog
				open={isDeleteConfirmOpen}
				onOpenChange={(open) => {
					if (!open && isDeletingId !== deletingFeed?.id) {
						setDeletingFeed(null);
						setIsDeleteConfirmOpen(false);
					}
				}}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{DICT.ICAL.DELETE.TITLE}</AlertDialogTitle>
						<AlertDialogDescription>{DICT.ICAL.DELETE.MESSAGE}</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="flex items-start gap-2">
						<Checkbox
							id="ical-delete-cancel"
							checked={cancelCleanings}
							onCheckedChange={(checked) => setCancelCleanings(checked === true)}
						/>
						<label htmlFor="ical-delete-cancel" className="text-sm">
							{DICT.ICAL.DELETE_CANCEL_CLEANINGS}
						</label>
					</div>
					{cancelCleanings && (
						<p className="text-xs text-muted-foreground">
							{DICT.ICAL.DELETE_WITH_CLEANINGS_MESSAGE}
						</p>
					)}
					<AlertDialogFooter>
						<AlertDialogCancel>{DICT.COMMON.ACTIONS.BACK}</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-white hover:bg-destructive/90"
							disabled={isDeletingId === deletingFeed?.id}
							onClick={(event) => {
								event.preventDefault();
								handleDeleteConfirm();
							}}>
							{isDeletingId === deletingFeed?.id
								? DICT.COMMON.ACTIONS.DELETING
								: DICT.COMMON.ACTIONS.DELETE}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
