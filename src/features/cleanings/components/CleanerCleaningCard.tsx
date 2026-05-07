'use client';

import { format } from 'date-fns';
import { Calendar, HandCoins, MapPin } from 'lucide-react';
import { memo, useMemo } from 'react';
import { EntityBadge } from '@/components/EntityBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CleaningRequest } from '@/features/cleanings/cleaningService';
import { mediaService } from '@/lib/mediaService';

interface CleanerCleaningCardProps {
	cleaning: CleaningRequest;
	onView: (id: string) => void;
}

export const CleanerCleaningCard = memo(({ cleaning, onView }: CleanerCleaningCardProps) => {
	const imageUrl = useMemo(() => {
		return mediaService.getMediaUrl(cleaning.property?.main_image_url || null, 'property-media');
	}, [cleaning.property?.main_image_url]);

	const formattedPostcode = useMemo(() => {
		return cleaning.property?.postcode?.toUpperCase();
	}, [cleaning.property?.postcode]);

	const isActive = cleaning.status === 'in_progress';

	return (
		<Card
			className={`overflow-hidden p-0 gap-4 transition-all cursor-pointer hover:scale-103 group relative ${
				isActive ? 'ring-2 ring-primary shadow-lg' : ''
			}`}
			onClick={(e) => {
				e.stopPropagation();
				onView(cleaning.id);
			}}>
			<div className="relative w-full h-48 overflow-hidden bg-muted">
				{imageUrl ? (
					<img
						src={imageUrl}
						alt={cleaning.property?.address_line_1}
						className="object-cover size-full"
					/>
				) : (
					<div className="flex items-center justify-center h-full text-muted-foreground/40">
						<MapPin className="size-8" />
					</div>
				)}

				<div className="absolute top-2 left-2">
					<EntityBadge
						variant={{ type: 'cleaning', value: cleaning.status }}
						customLabel={cleaning.status === 'confirmed' ? 'ASSIGNED' : undefined}
					/>
				</div>
			</div>

			<CardHeader className="pb-2">
				<CardTitle className="text-lg font-bold truncate">
					{cleaning.property?.address_line_1}
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					{cleaning.property?.town_city}, {formattedPostcode}
				</p>
			</CardHeader>

			<CardContent className="pb-4">
				<div className="flex items-center justify-between border-t pt-4">
					<div className="space-y-1">
						<div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
							<Calendar className="size-3" />
							Scheduled
						</div>
						<p className="text-sm font-medium">
							{format(new Date(cleaning.scheduled_start), 'MMM d, h:mm a')}
						</p>
					</div>
					<div className="text-right">
						<div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
							<HandCoins className="size-3" />
							Earnings
						</div>
						<p className="text-sm font-medium">£{cleaning.cleaner_pay?.toFixed(2) ?? '0.00'}</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
});
