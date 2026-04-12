'use client';

import {
	Bath,
	Bed,
	CheckCircle2,
	Clock,
	Info,
	ListChecks,
	MapPin,
	Play,
	SquareCheckBig,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { type CleaningRequest } from '@/features/cleanings/cleaningService';
import { CleaningStatusBadge } from '@/features/cleanings/components/CleaningStatusBadge';
import { useCleanerCleanings } from '@/features/cleanings/useCleanerCleanings';
import { useGeolocation } from '@/hooks/useGeolocation';
import { toast } from 'sonner';

interface CleanerCleaningDetailViewProps {
	cleaning: CleaningRequest;
}

export function CleanerCleaningDetailView({ cleaning }: CleanerCleaningDetailViewProps) {
	const { handleClockIn, handleClockOut } = useCleanerCleanings();
	const { checkProximity, isLoading: isGeoLoading } = useGeolocation();
	const [isProcessing, setIsProcessing] = useState(false);

	const tasks = Array.isArray(cleaning.tasks) ? cleaning.tasks : [];
	const isConfirmed = cleaning.status === 'confirmed';
	const isInProgress = cleaning.status === 'in_progress';

	const onClockIn = async () => {
		if (!cleaning.property?.postcode) {
			return;
		}
		
		setIsProcessing(true);
		const isNear = await checkProximity(cleaning.property.postcode);

		if (!isNear) {
			toast.error('You must be at the property to clock in.');
			setIsProcessing(false);
			return;
		}

		await handleClockIn(cleaning.id);
		setIsProcessing(false);
	};

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
						<div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
							<Clock className="size-5 text-primary shrink-0" />
							<div className="min-w-0">
								<p className="text-[10px] text-muted-foreground uppercase font-bold">Scheduled</p>
								<p className="text-sm font-medium truncate">
									{new Date(cleaning.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
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

					{cleaning.instructions && (
						<div className="space-y-2">
							<h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
								<Info className="size-4" /> Instructions
							</h4>
							<div className="p-3 rounded-md border bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50">
								<p className="text-sm leading-relaxed">{cleaning.instructions}</p>
							</div>
						</div>
					)}

					<div className="space-y-3">
						<h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
							<ListChecks className="size-4" /> Checklist
						</h4>
						<div className="rounded-md border bg-muted/10 divide-y">
							{tasks.map((task, index) => (
								<div key={index} className="flex items-center gap-3 px-3 py-3">
									<div className={`size-5 rounded border flex items-center justify-center shrink-0 ${task.is_completed ? 'bg-green-500 border-green-500' : 'bg-background'}`}>
										{task.is_completed && <CheckCircle2 className="size-3.5 text-white" />}
									</div>
									<span className={`text-sm ${task.is_completed ? 'text-muted-foreground line-through' : 'font-medium'}`}>
										{task.description}
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</ScrollArea>

			{(isConfirmed || isInProgress) && (
				<div className="p-4 border-t bg-background shrink-0">
					{isConfirmed && (
						<Button 
							className="w-full h-12 text-base font-bold" 
							onClick={onClockIn}
							disabled={isProcessing || isGeoLoading}
						>
							<Play className="mr-2 size-5 fill-current" />
							{isProcessing ? 'Verifying Location...' : 'Clock In'}
						</Button>
					)}
					{isInProgress && (
						<Button 
							className="w-full h-12 text-base font-bold" 
							variant="default"
							onClick={() => handleClockOut(cleaning.id)}
						>
							<SquareCheckBig className="mr-2 size-5" />
							Finish & Submit Report
						</Button>
					)}
				</div>
			)}
		</DialogContent>
	);
}