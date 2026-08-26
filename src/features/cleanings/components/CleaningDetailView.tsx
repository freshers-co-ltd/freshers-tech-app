'use client';

import { Image, MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EntityBadge } from '@/components/EntityBadge';
import { FullscreenMediaCarousel } from '@/components/FullscreenMediaCarousel';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DICT } from '@/dictionary';
import type { UserRole } from '@/features/auth/types';
import { useCleanerPayConfig } from '@/features/cleanings/CleanerPayContext';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import { CleaningActionButtons } from '@/features/cleanings/components/CleaningActionButtons';
import { CleaningEvidenceForm } from '@/features/cleanings/components/CleaningEvidenceForm';
import { CleaningReportView } from '@/features/cleanings/components/CleaningReportView';
import { CleaningRequestDetails } from '@/features/cleanings/components/CleaningrequestDetails';
import { CleaningTaskList } from '@/features/cleanings/components/CleaningTaskList';
import { useCleanerCleanings } from '@/features/cleanings/hooks/useCleanerCleanings';
import { useClockInOut } from '@/features/cleanings/hooks/useClockInOut';
import { useEvidenceSubmission } from '@/features/cleanings/hooks/useEvidenceSubmission';
import { useTaskSync } from '@/features/cleanings/hooks/useTaskSync';
import type { CleaningRequest } from '@/features/cleanings/types';
import { CLEANING_STATUS } from '@/features/cleanings/types';
import { useMediaUrls } from '@/hooks/useMediaUrls';
import { formatPostcode } from '@/lib/utils';

interface CleaningDetailViewProps {
	cleaning: CleaningRequest;
	userRole: UserRole;
	onEdit?: (id: string) => void;
	onDelete?: (id: string) => void;
	onVerify?: (id: string) => void;
}

export function CleaningDetailView({
	cleaning,
	userRole,
	onEdit,
	onDelete,
	onVerify,
}: CleaningDetailViewProps) {
	const isCleaner = userRole === 'cleaner';
	const isHost = userRole === 'host';
	const isAdmin = userRole === 'admin';

	const { updateCleaning, addEvidence, upsertReport, updateTasksBatch } = useCleanings();
	const { handleClockIn } = useCleanerCleanings();

	const {
		canClockIn,
		isProcessing: isClockInProcessing,
		onClockIn,
	} = useClockInOut({
		cleaning,
		onClockIn: handleClockIn,
	});

	const { localTasks, handleTaskToggle, handleSyncTasks } = useTaskSync({
		cleaning,
		updateTasksBatch,
	});

	const { config: cleanerPayConfig } = useCleanerPayConfig();

	const estimatedHours = useMemo(() => {
		if (!cleanerPayConfig || !cleaning.property) {
			return null;
		}

		const { type, bedrooms, bathrooms } = cleaning.property;
		const { target_times, bathroom_time } = cleanerPayConfig;

		let targetHours: number | null = null;

		if (type === 'studio') {
			targetHours = target_times.studio;
		} else if (bedrooms != null) {
			const key = `${bedrooms}_bed` as keyof typeof target_times;
			targetHours = target_times[key] ?? null;

			if (targetHours == null) {
				const bedroomKeys = (Object.keys(target_times) as (keyof typeof target_times)[])
					.filter((k) => k.endsWith('_bed'))
					.map((k) => ({ key: k, num: Number.parseInt(k.split('_')[0] ?? '0', 10) }))
					.sort((a, b) => b.num - a.num);
				const bestMatch = bedroomKeys[0];
				if (bestMatch) {
					targetHours = target_times[bestMatch.key];
				}
			}
		}

		if (targetHours == null) {
			return null;
		}

		const bathroomBonus = Math.max(0, (bathrooms ?? 0) - 1) * (bathroom_time ?? 0.5);
		return targetHours + bathroomBonus;
	}, [cleanerPayConfig, cleaning.property]);

	const {
		showEvidenceForm,
		setShowEvidenceForm,
		isFullScreen,
		setIsFullScreen,
		selectedMediaIndex,
		setSelectedMediaIndex,
		isFinishDisabled,
		onFormSubmit,
	} = useEvidenceSubmission({
		cleaning,
		addEvidence,
		upsertReport,
		updateCleaning,
		handleSyncTasks,
	});

	const tasks = localTasks;
	const evidence = Array.isArray(cleaning.evidence) ? cleaning.evidence : [];
	const isInProgress = cleaning.status === CLEANING_STATUS.IN_PROGRESS;
	const isCompleted = cleaning.status === CLEANING_STATUS.COMPLETED;

	const allTasksCompleted = useMemo(
		() => tasks.length > 0 && tasks.every((t) => t.is_completed),
		[tasks],
	);

	const [propertyGalleryOpen, setPropertyGalleryOpen] = useState(false);

	const evidencePaths = useMemo(() => evidence.map((item) => item.media_url), [evidence]);
	const evidenceUrls = useMediaUrls(evidencePaths, 'cleaning-media');
	const evidenceMedia = useMemo(
		() =>
			evidence.map((item, index) => ({
				url: evidenceUrls[index] ?? '/placeholder-image.webp',
				type: item.type,
			})),
		[evidence, evidenceUrls],
	);

	const propertyPaths = useMemo(() => {
		const property = cleaning.property;
		if (!property) {
			return [];
		}
		return [property.main_image_url, ...(property.extra_images_urls ?? [])].filter(
			Boolean,
		) as string[];
	}, [cleaning.property?.main_image_url, cleaning.property?.extra_images_urls, cleaning.property]);

	const propertyMediaUrls = useMediaUrls(propertyPaths, 'property-media');
	const propertyMedia = useMemo(
		() => propertyMediaUrls.map((url) => ({ url, type: 'image' as const })),
		[propertyMediaUrls],
	);

	const expiryInfo = useMemo(() => {
		if (!cleaning.clock_out_time) {
			return null;
		}
		const completedAt = new Date(cleaning.clock_out_time);
		const expiresAt = new Date(completedAt.getTime() + 20 * 24 * 60 * 60 * 1000);
		const now = new Date();
		const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
		return { daysRemaining, isExpired: daysRemaining <= 0 };
	}, [cleaning.clock_out_time]);

	const isClockInDisabled = !canClockIn || isClockInProcessing;

	return (
		<div className="flex flex-col overflow-hidden flex-1">
			<DialogHeader className="p-6 pb-0 shrink-0">
				<div className="flex justify-between items-start gap-4">
					<div className="space-y-1 min-w-0">
						<DialogTitle className="wrap-break-word text-xl font-bold leading-tight">
							{showEvidenceForm
								? DICT.CLEANINGS.DETAIL.REPORT.TITLE
								: cleaning.property?.address_line_1}
						</DialogTitle>
						{!showEvidenceForm && (
							<div className="flex items-center gap-1 text-muted-foreground text-sm">
								<MapPin className="size-3 shrink-0" />
								<span className="truncate">
									{cleaning.property?.town_city},{' '}
									{formatPostcode(cleaning.property?.postcode ?? '')}
								</span>
							</div>
						)}
						{!showEvidenceForm && propertyMedia.length > 0 && (
							<Button
								variant="outline"
								size="sm"
								className="mt-2"
								onClick={() => setPropertyGalleryOpen(true)}>
								<Image className="size-4 mr-2" />
								{DICT.CLEANINGS.DETAIL.BUTTON_VIEW_IMAGES}
							</Button>
						)}
					</div>
					{!showEvidenceForm && (
						<div className="flex items-center gap-2 mr-8">
							<EntityBadge
								variant={{ type: 'cleaning', value: cleaning.status }}
								customLabel={
									isCleaner && cleaning.status === CLEANING_STATUS.CONFIRMED
										? 'ASSIGNED'
										: undefined
								}
							/>
							{cleaning.source !== 'manual' && cleaning.status !== CLEANING_STATUS.UNVERIFIED && (
								<EntityBadge variant={{ type: 'ical', value: 'generated' }} />
							)}
						</div>
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

								<CleaningRequestDetails
									cleaning={cleaning}
									userRole={userRole}
									estimatedHours={estimatedHours}
								/>

								<CleaningTaskList
									tasks={tasks}
									interactive={isCleaner && isInProgress}
									showCustomIndicator={isHost || isAdmin}
									onTaskToggle={handleTaskToggle}
								/>

								{isCompleted &&
									(cleaning.report || (evidence.length > 0 && !expiryInfo?.isExpired)) && (
										<CleaningReportView
											cleaning={cleaning}
											evidenceMedia={evidenceMedia}
											expiryInfo={expiryInfo}
											onMediaClick={(index) => {
												setSelectedMediaIndex(index);
												setIsFullScreen(true);
											}}
										/>
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
					onVerify={onVerify}
					cleaningId={cleaning.id}
					isClockInDisabled={isClockInDisabled}
					isFinishDisabled={isFinishDisabled}
				/>
			)}

			<FullscreenMediaCarousel
				media={evidenceMedia}
				initialMedia={evidenceMedia[selectedMediaIndex]?.url}
				open={isFullScreen}
				onOpenChange={setIsFullScreen}
				alt={DICT.CLEANINGS.DETAIL.EVIDENCE.MEDIA_ALT}
			/>

			<FullscreenMediaCarousel
				media={propertyMedia}
				initialMedia={propertyMedia[0]?.url}
				open={propertyGalleryOpen}
				onOpenChange={setPropertyGalleryOpen}
				alt={DICT.COMMON.LABELS.PROPERTY}
			/>
		</div>
	);
}
