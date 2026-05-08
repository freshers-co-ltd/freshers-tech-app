'use client';

import {
	AlertCircle,
	Bath,
	Bed,
	ChevronLeft,
	ChevronRight,
	Clock,
	Info,
	ListChecks,
	MapPin,
	Package,
	Play,
	SquareCheckBig,
	X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { EntityBadge } from '@/components/EntityBadge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DICT } from '@/dictionary';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import { CLEANING_STATUS, type CleaningRequest } from '@/features/cleanings/cleaningService';
import {
	CleaningEvidenceForm,
	type EvidenceFormValues,
} from '@/features/cleanings/components/CleaningEvidenceForm';
import { useCleanerCleanings } from '@/features/cleanings/useCleanerCleanings';
import { useCarousel } from '@/hooks/useCarousel';
import { useGeolocation } from '@/hooks/useGeolocation';
import { mediaService } from '@/lib/mediaService';

interface CleanerCleaningDetailViewProps {
	cleaning: CleaningRequest;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CleanerCleaningDetailView({
	cleaning,
	open,
	onOpenChange,
}: CleanerCleaningDetailViewProps) {
	const { updateCleaning, addEvidence, upsertReport, updateTasksBatch } = useCleanings();
	const { handleClockIn } = useCleanerCleanings();
	const { checkProximity, isLoading: isGeoLoading } = useGeolocation();
	const [isProcessing, setIsProcessing] = useState(false);
	const [showEvidenceForm, setShowEvidenceForm] = useState(false);
	const [isFullScreen, setIsFullScreen] = useState(false);
	const [localTasks, setLocalTasks] = useState(cleaning.tasks || []);

	const tasksRef = useRef(cleaning.tasks || []);
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
		onOpenChange(newOpen);
	};

	const tasks = localTasks;
	const evidence = Array.isArray(cleaning.evidence) ? cleaning.evidence : [];
	const isConfirmed = cleaning.status === CLEANING_STATUS.CONFIRMED;
	const isInProgress = cleaning.status === CLEANING_STATUS.IN_PROGRESS;
	const isCompleted = cleaning.status === CLEANING_STATUS.COMPLETED;

	const allTasksCompleted = useMemo(
		() => tasks.length > 0 && tasks.every((t) => t.is_completed),
		[tasks],
	);

	const evidenceUrls = useMemo(
		() => evidence.map((item) => mediaService.getMediaUrl(item.media_url, 'cleaning-media')),
		[evidence],
	);

	const { activeImage, setActiveImage, currentIndex, nextImage, prevImage, allImages } =
		useCarousel({
			images: evidenceUrls,
			initialImage: evidenceUrls[0] || '',
			isKeyboardEnabled: isFullScreen,
		});

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
			onOpenChange(false);
		} catch {
			toast.error('Failed to submit report. Please try again.');
		} finally {
			setIsProcessing(false);
		}
	};

	const handleToggleTask = (taskId: string) => {
		if (!isInProgress) {
			return;
		}
		setLocalTasks((prev) =>
			prev.map((t) => (t.id === taskId ? { ...t, is_completed: !t.is_completed } : t)),
		);
	};

	return (
		<Dialog open={open} onOpenChange={handleDialogChange}>
			<DialogContent className="max-w-2xl! w-screen sm:w-full h-[95svh] flex flex-col p-0 overflow-hidden">
				<DialogHeader className="p-6 pb-2 shrink-0">
					<div className="flex justify-between items-start gap-4">
						<div className="space-y-1 min-w-0">
							<DialogTitle className="wrap-break-word text-xl font-bold leading-tight">
								{cleaning.property?.address_line_1}
							</DialogTitle>
							<div className="flex items-center gap-1 text-muted-foreground text-sm">
								<MapPin className="size-3 shrink-0" />
								<span className="truncate">
									{cleaning.property?.town_city}, {cleaning.property?.postcode}
								</span>
							</div>
						</div>
						<EntityBadge
							variant={{ type: 'cleaning', value: cleaning.status }}
							customLabel={cleaning.status === 'confirmed' ? 'ASSIGNED' : undefined}
						/>
					</div>
				</DialogHeader>

				<div className="relative flex-1 min-h-0">
					<ScrollArea className="h-full w-full">
						<div className="w-full p-4 sm:p-6 space-y-6 max-w-full overflow-hidden">
							<Separator />

							<div className="grid grid-cols-2 gap-4">
								<div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 min-w-0">
									<Clock className="size-5 text-primary shrink-0" />
									<div className="min-w-0">
										<p className="text-[10px] text-muted-foreground uppercase font-bold">
											Scheduled
										</p>
										<p className="text-sm font-medium truncate">
											{new Date(cleaning.scheduled_start).toLocaleTimeString([], {
												hour: '2-digit',
												minute: '2-digit',
											})}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 min-w-0">
									<Info className="size-5 text-primary shrink-0" />
									<div className="flex gap-3">
										<div className="flex items-center gap-1">
											<Bed className="size-3.5 text-muted-foreground" />
											<span className="text-sm font-bold">{cleaning.property?.bedrooms}</span>
										</div>
										<div className="flex items-center gap-1">
											<Bath className="size-3.5 text-muted-foreground" />
											<span className="text-sm font-bold">{cleaning.property?.bathrooms}</span>
										</div>
									</div>
								</div>
							</div>

							{showEvidenceForm && cleaning.cleaner_id ? (
								<div className="space-y-4">
									<Button variant="ghost" size="sm" onClick={() => setShowEvidenceForm(false)}>
										← Back to Checklist
									</Button>
									<CleaningEvidenceForm
										cleaningId={cleaning.id}
										cleanerId={cleaning.cleaner_id}
										onSubmit={onFormSubmit}
									/>
								</div>
							) : (
								<>
									{cleaning.instructions && (
										<div className="space-y-2">
											<h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
												<Info className="size-4 text-primary" /> Instructions
											</h4>
											<div className="p-3 rounded-md border bg-muted/30">
												<p className="text-sm leading-relaxed whitespace-pre-wrap">
													{cleaning.instructions}
												</p>
											</div>
										</div>
									)}

									<div className="space-y-3">
										<h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
											<ListChecks className="size-4 text-primary" /> Checklist
										</h4>
										<div className="rounded-md border bg-muted/10 divide-y overflow-hidden">
											{tasks.map((task) => (
												<div key={task.id} className="flex items-center gap-3 px-3 py-3">
													<Checkbox
														id={task.id}
														checked={task.is_completed}
														disabled={!isInProgress}
														onCheckedChange={() => handleToggleTask(task.id)}
														className="size-5 shrink-0"
													/>
													<Label
														htmlFor={task.id}
														className={`text-sm flex-1 ${isInProgress ? 'cursor-pointer' : ''} ${task.is_completed ? 'text-muted-foreground line-through' : 'font-medium'}`}>
														{task.description}
													</Label>
												</div>
											))}
										</div>
									</div>

									{isCompleted && (
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

											{evidenceUrls.length > 0 && (
												<div className="space-y-3 w-full min-w-0 overflow-hidden">
													<h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
														Cleaning Evidence
													</h4>
													<ScrollArea className="w-full">
														<div className="flex gap-2 p-1 min-w-0">
															{evidence.map((item) => (
																<Button
																	key={item.id}
																	variant="outline"
																	className="p-0 size-40 shrink-0 overflow-hidden border rounded-md"
																	onClick={() => {
																		setActiveImage(
																			mediaService.getMediaUrl(item.media_url, 'cleaning-media'),
																		);
																		setIsFullScreen(true);
																	}}>
																	{item.type === 'image' ? (
																		<img
																			src={mediaService.getMediaUrl(
																				item.media_url,
																				'cleaning-media',
																			)}
																			className="size-full object-cover"
																			alt="Evidence"
																		/>
																	) : (
																		<video
																			src={mediaService.getMediaUrl(
																				item.media_url,
																				'cleaning-media',
																			)}
																			className="size-full object-cover">
																			<track kind="captions" />
																		</video>
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

				{!showEvidenceForm && (isConfirmed || isInProgress) && (
					<div className="p-4 border-t bg-background shrink-0">
						{isConfirmed && (
							<Button
								className="w-full h-12 text-base font-bold"
								onClick={onClockIn}
								disabled={isProcessing || isGeoLoading}>
								<Play className="mr-1 size-5 fill-current" />
								{isProcessing ? 'Verifying Location...' : 'Clock In'}
							</Button>
						)}
						{isInProgress && (
							<Button
								className="w-full h-12 text-base font-bold"
								disabled={!allTasksCompleted}
								onClick={() => setShowEvidenceForm(true)}>
								<SquareCheckBig className="mr-1 size-5" />
								{allTasksCompleted ? 'Finish & Submit Report' : 'Complete All Tasks to Finish'}
							</Button>
						)}
					</div>
				)}

				<Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
					<DialogContent className="max-w-7xl! w-[95vw] h-[90vh] p-0 bg-card border-none flex flex-col items-center justify-start overflow-hidden rounded-lg shadow-xl [&>button]:hidden">
						<DialogHeader>
							<DialogTitle className="sr-only">{DICT.PROPERTIES.FULLSCREEN_VIEW}</DialogTitle>
							<DialogDescription className="sr-only">
								Viewing evidence {currentIndex + 1}.
							</DialogDescription>
						</DialogHeader>

						<div className="absolute top-0 right-0 z-50 p-6">
							<Button
								variant="ghost"
								size="icon"
								className="rounded-full shadow-sm size-10 bg-background/80 backdrop-blur-md"
								onClick={() => setIsFullScreen(false)}>
								<X className="size-5" />
							</Button>
						</div>

						{allImages.length > 1 && (
							<div className="absolute left-0 right-0 z-50 px-6 flex-center bottom-5">
								<div className="flex items-center gap-4 p-1 border rounded-xl shadow-lg bg-background/80 backdrop-blur-md">
									<Button variant="ghost" size="icon" className="size-10" onClick={prevImage}>
										<ChevronLeft className="size-6" />
									</Button>
									<div className="px-2 text-sm font-semibold text-muted-foreground">
										{currentIndex + 1} / {allImages.length}
									</div>
									<Button variant="ghost" size="icon" className="size-10" onClick={nextImage}>
										<ChevronRight className="size-6" />
									</Button>
								</div>
							</div>
						)}

						<div className="relative flex-col-center size-full">
							<img
								src={activeImage}
								className="relative z-10 object-contain w-full max-h-[85dvh] select-none"
								alt="Fullscreen evidence"
							/>
						</div>
					</DialogContent>
				</Dialog>
			</DialogContent>
		</Dialog>
	);
}
