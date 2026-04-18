'use client';

import {
	AlertTriangle,
	Bath,
	Bed,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Clock,
	FileImage,
	Info,
	ListChecks,
	MapPin,
	Maximize2,
	PackageSearch,
	Pencil,
	Trash2,
	User,
	X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DICT } from '@/dictionary';
import { useAuth } from '@/features/auth/AuthContext';
import { type CleaningRequest, STATUS_GROUPS } from '@/features/cleanings/cleaningService';
import { CleaningStatusBadge } from '@/features/cleanings/components/CleaningStatusBadge';
import { useCarousel } from '@/hooks/useCarousel';
import { mediaService } from '@/lib/mediaService';

interface HostCleaningDetailViewProps {
	cleaning: CleaningRequest;
	onEdit: (id: string) => void;
	onDelete: (id: string) => void;
}

export function HostCleaningDetailView({
	cleaning,
	onEdit,
	onDelete,
}: HostCleaningDetailViewProps) {
	const { user } = useAuth();
	const [isReportOpen, setIsReportOpen] = useState(false);
	const [isFullScreen, setIsFullScreen] = useState(false);

	const isHost = user?.user_metadata?.role === 'host';
	const tasks = Array.isArray(cleaning.tasks) ? cleaning.tasks : [];
	const hasEvidence = !!(cleaning.status === 'completed' && cleaning.evidence?.length);

	const hasBrokenItems = !!cleaning.report?.broken_items_report;
	const isSuppliesLow = !!cleaning.report?.low_supplies_report;

	const canEdit = STATUS_GROUPS.CAN_EDIT.includes(cleaning.status);
	const canCancel = STATUS_GROUPS.CAN_CANCEL.includes(cleaning.status);

	const evidenceUrls = useMemo(
		() =>
			(cleaning.evidence || []).map((m) => mediaService.getMediaUrl(m.media_url, 'cleaning-media')),
		[cleaning.evidence],
	);

	const { activeImage, setActiveImage, currentIndex, nextImage, prevImage, allImages } =
		useCarousel({
			images: evidenceUrls,
			initialImage: evidenceUrls[0] || '',
			isKeyboardEnabled: isFullScreen,
		});

	const scheduledDate = new Date(cleaning.scheduled_start);
	const longDate = scheduledDate.toLocaleDateString(undefined, {
		weekday: 'short',
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
	const shortDate = scheduledDate.toLocaleDateString('en-GB', {
		day: '2-digit',
		month: '2-digit',
		year: '2-digit',
	});
	const formattedTime = scheduledDate.toLocaleTimeString(undefined, {
		hour: '2-digit',
		minute: '2-digit',
		hour12: true,
	});

	return (
		<DialogContent className="sm:max-w-2xl h-fit max-h-[95svh] flex flex-col p-0 overflow-hidden">
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
					<CleaningStatusBadge status={cleaning.status} />
				</div>
			</DialogHeader>

			<ScrollArea className="flex-1 min-h-0 w-full overflow-y-auto">
				<div className="px-6 space-y-6 pb-6">
					<Separator />

					<div className="grid grid-cols-2 gap-4">
						<div className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30">
							<Clock className="size-5 text-primary shrink-0" />
							<div className="min-w-0">
								<p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">
									Scheduled
								</p>
								<p className="text-sm font-medium truncate">
									<span className="sm:hidden">{shortDate}</span>
									<span className="hidden sm:inline">{longDate}</span>
								</p>
								<p className="text-xs font-bold text-primary">{formattedTime}</p>
							</div>
						</div>
						<div className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30">
							<CheckCircle2 className="size-5 text-primary shrink-0" />
							<div>
								<p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">
									Total Cost
								</p>
								<p className="text-sm font-bold text-primary">£{cleaning.service_cost}</p>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-3">
							<h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 tracking-wider">
								<Info className="size-4 text-primary" />
								Property Specs
							</h4>
							<div className="flex gap-4 p-2 rounded-md border bg-muted/10">
								<div className="flex items-center gap-2">
									<Bed className="size-4 text-muted-foreground" />
									<span>{cleaning.property?.bedrooms}</span>
								</div>
								<div className="flex items-center gap-2">
									<Bath className="size-4 text-muted-foreground" />
									<span>{cleaning.property?.bathrooms}</span>
								</div>
								<span className=" font-medium capitalize text-primary/80 ml-auto">
									{cleaning.property?.type}
								</span>
							</div>
						</div>

						<div className="space-y-3">
							<h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 tracking-wider">
								<User className="size-4 text-primary" />
								Assigned Cleaner
							</h4>
							<div className="p-2 rounded-md border bg-muted/10">
								{cleaning.cleaner?.full_name ? (
									<div className="flex items-center gap-2">
										<span className="text-sm font-semibold">{cleaning.cleaner.full_name}</span>
									</div>
								) : (
									<span className="text-sm text-muted-foreground">Pending assignment...</span>
								)}
							</div>
						</div>
					</div>

					{cleaning.instructions && (
						<div className="space-y-3">
							<h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 tracking-wider">
								<Info className="size-4 text-primary" />
								Special Instructions
							</h4>
							<div className="py-2 px-3 rounded-md border bg-muted/10">
								<p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
									{cleaning.instructions}
								</p>
							</div>
						</div>
					)}

					<div className="space-y-3">
						<h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 tracking-wider">
							<ListChecks className="size-4 text-primary" />
							Service Checklist
						</h4>

						<div className="rounded-md border bg-muted/10 divide-y">
							{tasks.map((task, index) => (
								<div
									key={`${task.description}-${index}`}
									className={`flex items-center gap-3 px-3 py-2.5 ${
										task.is_custom ? 'bg-primary/5' : ''
									}`}>
									<span className="flex items-center justify-center size-5 shrink-0 text-[10px] font-bold text-muted-foreground/60">
										{String(index + 1).padStart(2, '0')}
									</span>

									<div className="flex flex-1 items-center justify-between min-w-0">
										<span className="text-sm font-medium wrap-break-word">
											{task.description}
											{task.is_custom && (
												<span className="ml-2 text-[9px] font-black text-primary uppercase border border-primary/20 px-1 rounded-sm bg-primary/5 whitespace-nowrap">
													Custom
												</span>
											)}
										</span>

										{task.is_completed && (
											<CheckCircle2 className="size-3.5 text-green-500 shrink-0 ml-2" />
										)}
									</div>
								</div>
							))}

							{tasks.length === 0 && (
								<p className="text-sm text-muted-foreground text-center py-8">No tasks defined.</p>
							)}
						</div>
					</div>
				</div>
			</ScrollArea>

			{(hasEvidence || (isHost && (canEdit || canCancel))) && (
				<div className="p-3 border-t bg-background shrink-0">
					{hasEvidence && (
						<Button className="w-full" onClick={() => setIsReportOpen(true)}>
							<FileImage className="mr-2 size-4" /> View Review Form and Evidence
						</Button>
					)}

					{isHost && (
						<div className="flex flex-col sm:flex-row gap-3">
							{canEdit && (
								<Button
									variant="outline"
									className="flex-1"
									disabled={!canEdit}
									onClick={() => onEdit(cleaning.id)}>
									<Pencil className="mr-2 size-4" /> {DICT.CLEANINGS.EDIT}
								</Button>
							)}
							{canCancel && (
								<Button
									variant="destructive"
									className="flex-1 "
									onClick={() => onDelete(cleaning.id)}>
									<Trash2 className="mr-2 size-4" />{' '}
									{cleaning.status === 'confirmed' ? 'Cancel Cleaning' : DICT.CLEANINGS.DELETE}
								</Button>
							)}
						</div>
					)}
				</div>
			)}

			<Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
				<DialogContent className="max-w-4xl! w-[95vw] h-[85svh] flex flex-col p-0 overflow-hidden">
					<DialogHeader className="p-6 pb-2 shrink-0">
						<div className="flex flex-col gap-1">
							<DialogTitle className="text-lg font-bold">Post-Clean Report</DialogTitle>
							<DialogDescription className="sr-only">
								Review form and visual evidence.
							</DialogDescription>
						</div>
					</DialogHeader>

					<ScrollArea className="flex-1 min-h-0 w-full">
						<div className="p-6 pt-0 space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div
									className={`p-3 rounded-lg border transition-colors ${hasBrokenItems ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30'}`}>
									<div className="flex flex-col gap-1 min-w-0">
										<div className="flex items-center gap-2">
											<AlertTriangle
												className={`size-4 shrink-0 ${hasBrokenItems ? 'text-destructive' : 'text-muted-foreground'}`}
											/>
											<p className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
												Broken Items
											</p>
										</div>
										<p className="text-sm font-medium leading-relaxed wrap-break-word">
											{cleaning.report?.broken_items_report ||
												'No items reported broken during this cleaning.'}
										</p>
									</div>
								</div>

								<div
									className={`p-3 rounded-lg border transition-colors ${isSuppliesLow ? 'bg-amber-500/5 border-amber-500/20' : 'bg-muted/30'}`}>
									<div className="flex flex-col gap-1 min-w-0">
										<div className="flex items-center gap-2">
											<PackageSearch
												className={`size-4 shrink-0 ${isSuppliesLow ? 'text-amber-600' : 'text-muted-foreground'}`}
											/>
											<p className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
												Cleaning Supplies
											</p>
										</div>
										<p className="text-sm font-medium leading-relaxed wrap-break-word">
											{cleaning.report?.low_supplies_report ||
												'All cleaning supplies are sufficiently stocked.'}
										</p>
									</div>
								</div>
							</div>

							<div className="flex flex-col lg:flex-row gap-4 overflow-hidden">
								<div className="relative aspect-video lg:aspect-auto lg:flex-1 lg:h-85 bg-muted rounded-lg overflow-hidden shrink-0 lg:shrink">
									<img src={activeImage} className="size-full object-contain" alt="Evidence" />
									<Button
										size="icon"
										variant="secondary"
										className="absolute bottom-2 right-2"
										onClick={() => setIsFullScreen(true)}>
										<Maximize2 className="size-4" />
									</Button>
								</div>

								<div className="w-full lg:w-24 max-w-full overflow-hidden shrink-0">
									<ScrollArea className="w-full lg:h-85">
										<div className="flex lg:flex-col gap-2 p-1">
											{allImages.map((url) => (
												<Button
													key={url}
													variant="outline"
													onClick={() => setActiveImage(url)}
													className={`p-0 size-16 lg:w-full lg:h-20 shrink-0 overflow-hidden transition-all ${
														activeImage === url
															? 'ring-2 ring-primary border-primary'
															: 'opacity-70'
													}`}>
													<img src={url} className="size-full object-cover" alt="Thumbnail" />
												</Button>
											))}
										</div>
										<ScrollBar orientation="horizontal" className="lg:hidden" />
										<ScrollBar orientation="vertical" className="hidden lg:block" />
									</ScrollArea>
								</div>
							</div>
						</div>
						<ScrollBar orientation="vertical" />
					</ScrollArea>
				</DialogContent>
			</Dialog>

			<Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
				<DialogContent className="max-w-7xl! w-[95vw] h-[90vh] p-0 bg-card border-none flex flex-col items-center justify-start overflow-hidden rounded-lg shadow-xl [&>button]:hidden">
					<DialogHeader>
						<DialogTitle className="sr-only">{DICT.PROPERTIES.LABELS.FULLSCREEN_VIEW}</DialogTitle>
						<DialogDescription className="sr-only">
							Viewing image {currentIndex + 1} of {allImages.length}.
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
								<Button
									variant="ghost"
									size="icon"
									className="size-10"
									onClick={(e) => {
										e.stopPropagation();
										prevImage();
									}}>
									<ChevronLeft className="size-6" />
								</Button>
								<div className="px-2 text-sm font-semibold text-muted-foreground">
									{currentIndex + 1} / {allImages.length}
								</div>
								<Button
									variant="ghost"
									size="icon"
									className="size-10"
									onClick={(e) => {
										e.stopPropagation();
										nextImage();
									}}>
									<ChevronRight className="size-6" />
								</Button>
							</div>
						</div>
					)}

					<div className="relative flex-col-center size-full">
						<img
							src={activeImage}
							className="relative z-10 object-contain w-full max-h-[85dvh] select-none"
							alt={DICT.PROPERTIES.LABELS.FULLSCREEN_VIEW}
							onError={(e) => {
								(e.target as HTMLImageElement).src = '/placeholder-property.jpg';
							}}
						/>
					</div>
				</DialogContent>
			</Dialog>
		</DialogContent>
	);
}
