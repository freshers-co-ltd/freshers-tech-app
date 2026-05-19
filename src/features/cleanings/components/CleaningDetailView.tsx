'use client';

import { AlertCircle, Banknote, Bath, Bed, Clock, Info, MapPin, Package, User } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EntityBadge } from '@/components/EntityBadge';
import { FullscreenMediaCarousel } from '@/components/FullscreenMediaCarousel';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { toast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { VideoThumbnail } from '@/components/VideoThumbnail';
import { DICT } from '@/dictionary';
import type { UserRole } from '@/features/auth/authService';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import { CLEANING_STATUS, type CleaningRequest } from '@/features/cleanings/cleaningService';
import { CleaningActionButtons } from '@/features/cleanings/components/CleaningActionButtons';
import {
	CleaningEvidenceForm,
	type EvidenceFormValues,
} from '@/features/cleanings/components/CleaningEvidenceForm';
import { CleaningTaskList } from '@/features/cleanings/components/CleaningTaskList';
import { useCleanerCleanings } from '@/features/cleanings/useCleanerCleanings';
import { useGeolocation } from '@/hooks/useGeolocation';
import { mediaService } from '@/lib/mediaService';
import { formatDate } from '@/lib/utils';

interface CleaningTask {
	id: string;
	description: string;
	is_completed: boolean;
	is_custom: boolean;
}

interface CleaningDetailViewProps {
	cleaning: CleaningRequest;
	userRole: UserRole;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	onEdit?: (id: string) => void;
	onDelete?: (id: string) => void;
}

export function CleaningDetailView({
	cleaning,
	userRole,
	open = true,
	onOpenChange,
	onEdit,
	onDelete,
}: CleaningDetailViewProps) {
	const isCleaner = userRole === 'cleaner';
	const isHost = userRole === 'host';
	const isAdmin = userRole === 'admin';

	const { updateCleaning, addEvidence, upsertReport, updateTasksBatch } = useCleanings();
	const { handleClockIn } = useCleanerCleanings();
	const { checkProximity, isLoading: isGeoLoading } = useGeolocation();

	const [isProcessing, setIsProcessing] = useState(false);
	const [showEvidenceForm, setShowEvidenceForm] = useState(false);
	const [isFullScreen, setIsFullScreen] = useState(false);
	const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
	const [localTasks, setLocalTasks] = useState<CleaningTask[]>(cleaning.tasks || []);

	const tasksRef = useRef<CleaningTask[]>(cleaning.tasks || []);
	const localTasksRef = useRef(localTasks);

	useEffect(() => {
		if (open) {
			setLocalTasks(cleaning.tasks || []);
			tasksRef.current = cleaning.tasks || [];
		}
	}, [open, cleaning.tasks]);

	useEffect(() => {
		localTasksRef.current = localTasks;
	}, [localTasks]);

	const handleSyncTasks = async () => {
		const originalTasks = tasksRef.current;
		const currentLocal = localTasksRef.current;

		const updates = currentLocal
			.filter((lt) => {
				const original = originalTasks.find((ot) => ot.id === lt.id);
				return original && original.is_completed !== lt.is_completed;
			})
			.map((t) => ({
				cleaning_id: cleaning.id,
				id: t.id,
				is_completed: t.is_completed,
			}));

		if (updates.length > 0) {
			try {
				await updateTasksBatch(cleaning.id, updates);
			} catch (error) {
				console.error(error);
			}
		}
	};

	const handleDialogChange = (newOpen: boolean) => {
		if (!newOpen) {
			handleSyncTasks();
		}
		onOpenChange?.(newOpen);
	};

	const handleTaskToggle = (taskId: string) => {
		if (!isCleaner || cleaning.status !== CLEANING_STATUS.IN_PROGRESS) {
			return;
		}
		setLocalTasks((prev) =>
			prev.map((t) => (t.id === taskId ? { ...t, is_completed: !t.is_completed } : t)),
		);
	};

	const tasks = localTasks;
	const evidence = Array.isArray(cleaning.evidence) ? cleaning.evidence : [];
	const isInProgress = cleaning.status === CLEANING_STATUS.IN_PROGRESS;
	const isCompleted = cleaning.status === CLEANING_STATUS.COMPLETED;

	const allTasksCompleted = useMemo(
		() => tasks.length > 0 && tasks.every((t) => t.is_completed),
		[tasks],
	);

	const evidenceMedia = useMemo(
		() =>
			evidence.map((item) => ({
				url: mediaService.getMediaUrl(item.media_url, 'cleaning-media'),
				type: item.type,
			})),
		[evidence],
	);

	const scheduledStart = new Date(cleaning.scheduled_start);
	const now = new Date();
	const minClockInTime = new Date(scheduledStart.getTime() - 10 * 60_000);
	const canClockIn = now.toDateString() === scheduledStart.toDateString() && now >= minClockInTime;

	const onClockIn = async () => {
		if (!cleaning.property?.postcode) {
			return;
		}
		setIsProcessing(true);
		try {
			const isNear = await checkProximity(cleaning.property.postcode);
			if (!isNear) {
				toast.error('You must be at the property to clock in.');
				return;
			}
			await handleClockIn(cleaning.id);
			toast.success('Successfully clocked in!');
		} catch {
			toast.error('Failed to clock in. Please try again.');
		} finally {
			setIsProcessing(false);
		}
	};

	const onFormSubmit = async (values: EvidenceFormValues, files: File[]) => {
		if (!cleaning.cleaner_id) {
			return;
		}
		setIsProcessing(true);
		try {
			await handleSyncTasks();

			for (const file of files) {
				const { path, error: uploadError } = await mediaService.uploadMedia(
					cleaning.id,
					file,
					'cleaning-media',
				);
				if (uploadError) {
					throw new Error(uploadError);
				}
				if (path) {
					await addEvidence({
						cleaning_id: cleaning.id,
						uploader_id: cleaning.cleaner_id,
						media_url: path,
						type: file.type.startsWith('video') ? 'video' : 'image',
					});
				}
			}

			await upsertReport({
				cleaning_id: cleaning.id,
				cleaner_id: cleaning.cleaner_id,
				broken_items_report: values.broken_items_report,
				low_supplies_report: values.low_supplies_report,
			});

			await updateCleaning(cleaning.id, { clock_out_time: new Date().toISOString() });
			toast.success('Cleaning completed and report submitted!');
			setShowEvidenceForm(false);
			onOpenChange?.(false);
		} catch {
			toast.error('Failed to submit report. Please try again.');
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleDialogChange}>
			<DialogContent className="max-w-2xl! w-screen sm:w-full h-[95svh] flex flex-col p-0 overflow-hidden">
				<DialogHeader className="p-6 pb-0 shrink-0">
					<div className="flex justify-between items-start gap-4">
						<div className="space-y-1 min-w-0">
							<DialogTitle className="wrap-break-word text-xl font-bold leading-tight">
								{showEvidenceForm ? 'Cleaning Report' : cleaning.property?.address_line_1}
							</DialogTitle>
							{!showEvidenceForm && (
								<div className="flex items-center gap-1 text-muted-foreground text-sm">
									<MapPin className="size-3 shrink-0" />
									<span className="truncate">
										{cleaning.property?.town_city}, {cleaning.property?.postcode}
									</span>
								</div>
							)}
						</div>
						{!showEvidenceForm && (
							<EntityBadge
								className="mr-8"
								variant={{ type: 'cleaning', value: cleaning.status }}
								customLabel={isCleaner && cleaning.status === 'confirmed' ? 'ASSIGNED' : undefined}
							/>
						)}
					</div>
				</DialogHeader>

				<div className="relative flex-1 min-h-0">
					<ScrollArea className="h-full w-full">
						<div className="w-full p-4 sm:p-6 space-y-6 max-w-full overflow-hidden">
							{showEvidenceForm && cleaning.cleaner_id ? (
								<CleaningEvidenceForm
									cleaningId={cleaning.id}
									cleanerId={cleaning.cleaner_id}
									onSubmit={onFormSubmit}
									onCancel={() => setShowEvidenceForm(false)}
								/>
							) : (
								<>
									<Separator />

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 min-w-0">
											<Clock className="size-5 text-primary shrink-0" />
											<div className="min-w-0">
												<p className="text-[10px] text-muted-foreground uppercase font-bold">
													Scheduled
												</p>
												<span>{formatDate(cleaning.scheduled_start)}</span>
												<span> at {formatDate(cleaning.scheduled_start, { variant: 'time' })}</span>
											</div>
										</div>

										<div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 min-w-0">
											<Banknote className="size-5 text-primary shrink-0" />
											<div className="min-w-0 flex gap-4">
												{isAdmin ? (
													<>
														<div>
															<p className="text-[10px] text-muted-foreground uppercase font-bold">
																Host Cost
															</p>
															{cleaning.service_cost === null ? (
																<p className="text-muted-foreground">Not set</p>
															) : (
																<p>
																	{DICT.COMMON.CURRENCY}
																	{cleaning.service_cost.toFixed(2)}
																</p>
															)}
														</div>
														<div>
															<p className="text-[10px] text-muted-foreground uppercase font-bold">
																Cleaner Pay
															</p>
															<p>
																{DICT.COMMON.CURRENCY}
																{cleaning.cleaner_pay?.toFixed(2) ?? '0.00'}
															</p>
														</div>
													</>
												) : isHost ? (
													<div>
														<p className="text-[10px] text-muted-foreground uppercase font-bold">
															Cost
														</p>
														{cleaning.service_cost === null ? (
															<p className="text-muted-foreground">Not set</p>
														) : (
															<p>
																{DICT.COMMON.CURRENCY}
																{cleaning.service_cost.toFixed(2)}
															</p>
														)}
													</div>
												) : (
													<div>
														<p className="text-[10px] text-muted-foreground uppercase font-bold">
															Earnings
														</p>
														<p>
															{DICT.COMMON.CURRENCY}
															{cleaning.cleaner_pay?.toFixed(2) ?? '0.00'}
														</p>
													</div>
												)}
											</div>
										</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 min-w-0">
											<Info className="size-5 text-primary shrink-0" />
											<div className="">
												<p className="text-[10px] text-muted-foreground uppercase font-bold">
													Details
												</p>

												<div className="flex gap-3">
													<div className="flex items-center gap-1">
														<Bed className="size-4 " />
														<span>{cleaning.property?.bedrooms}</span>
													</div>
													<div className="flex items-center gap-1">
														<Bath className="size-4" />
														<span>{cleaning.property?.bathrooms}</span>
													</div>
													<span className="ml-auto capitalize">{cleaning.property?.type}</span>
												</div>
											</div>
										</div>
										{(isHost || isAdmin) && (
											<div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 min-w-0">
												<User className="size-5 text-primary shrink-0" />
												<div className="min-w-0">
													<p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
														Assigned Cleaner
													</p>
													{cleaning.cleaner?.full_name ? (
														<span className="text-sm truncate">{cleaning.cleaner.full_name}</span>
													) : (
														<span className="text-sm text-muted-foreground">
															Pending assignment...
														</span>
													)}
												</div>
											</div>
										)}
									</div>

									{cleaning.instructions && (
										<div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 min-w-0">
											<Clock className="size-5 text-primary shrink-0" />
											<div className="min-w-0">
												<p className="text-[10px] text-muted-foreground uppercase font-bold">
													Instructions
												</p>
												<span>{cleaning.instructions}</span>
											</div>
										</div>
									)}

									<CleaningTaskList
										tasks={tasks}
										interactive={isCleaner && isInProgress}
										showCustomIndicator={isHost || isAdmin}
										onTaskToggle={handleTaskToggle}
									/>

									{isCompleted && (cleaning.report || evidence.length > 0) && (
										<div className="grid grid-cols-1 gap-6 pt-2 w-full overflow-hidden">
											{cleaning.report && (
												<div className="grid grid-cols-1 gap-4">
													{cleaning.report.broken_items_report && (
														<div className="space-y-2">
															<h4 className="text-xs font-bold uppercase text-destructive tracking-wider flex items-center gap-2">
																<AlertCircle className="size-4" /> Broken Items
															</h4>
															<div className="p-3 rounded-md border border-destructive/20 bg-destructive/5">
																<p className="text-sm">{cleaning.report.broken_items_report}</p>
															</div>
														</div>
													)}
													{cleaning.report.low_supplies_report && (
														<div className="space-y-2">
															<h4 className="text-xs font-bold uppercase text-orange-500 tracking-wider flex items-center gap-2">
																<Package className="size-4" /> Low Supplies
															</h4>
															<div className="p-3 rounded-md border border-orange-200 bg-orange-50">
																<p className="text-sm">{cleaning.report.low_supplies_report}</p>
															</div>
														</div>
													)}
												</div>
											)}

											{evidenceMedia.length > 0 && (
												<div className="space-y-3 w-full min-w-0 overflow-hidden">
													<h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
														Cleaning Evidence
													</h4>
													<ScrollArea className="w-full pb-2">
														<div className="flex gap-2 p-1 min-w-0">
															{evidence.map((item, index) => (
																<Button
																	key={item.id}
																	variant="outline"
																	className="p-0 size-40 shrink-0 overflow-hidden border rounded-md"
																	onClick={() => {
																		setSelectedMediaIndex(index);
																		setIsFullScreen(true);
																	}}>
																	{item.type === 'image' ? (
																		<ImageWithFallback
																			src={mediaService.getMediaUrl(
																				item.media_url,
																				'cleaning-media',
																			)}
																			className="size-full object-cover"
																			alt="Evidence"
																		/>
																	) : (
																		<VideoThumbnail
																			src={mediaService.getMediaUrl(
																				item.media_url,
																				'cleaning-media',
																			)}
																			className="size-full"
																		/>
																	)}
																</Button>
															))}
														</div>
														<ScrollBar orientation="horizontal" />
													</ScrollArea>
												</div>
											)}
										</div>
									)}
								</>
							)}
						</div>
					</ScrollArea>
				</div>

				{!showEvidenceForm && (
					<CleaningActionButtons
						userRole={userRole}
						status={cleaning.status}
						allTasksCompleted={allTasksCompleted}
						onClockIn={isCleaner ? onClockIn : undefined}
						onFinish={isCleaner ? () => setShowEvidenceForm(true) : undefined}
						onEdit={onEdit}
						onDelete={onDelete}
						cleaningId={cleaning.id}
						isClockInDisabled={!canClockIn || isProcessing || isGeoLoading}
						isFinishDisabled={isProcessing}
					/>
				)}

				<FullscreenMediaCarousel
					media={evidenceMedia}
					initialMedia={evidenceMedia[selectedMediaIndex]?.url}
					open={isFullScreen}
					onOpenChange={setIsFullScreen}
					alt="Evidence"
				/>
			</DialogContent>
		</Dialog>
	);
}
