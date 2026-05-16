'use client';

import { Banknote, Calendar, MapPin, Pencil, Trash2 } from 'lucide-react';
import { memo, useMemo } from 'react';
import { EntityBadge } from '@/components/EntityBadge';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DICT } from '@/dictionary';
import type { CleaningRequest } from '@/features/cleanings/cleaningService';
import { mediaService } from '@/lib/mediaService';
import { formatDate } from '@/lib/utils';

interface CleaningCardProps {
	cleaning: CleaningRequest;
	userRole: 'host' | 'cleaner';
	onView: (id: string) => void;
	onEdit?: (id: string) => void;
	onDelete?: (id: string) => void;
}

export const CleaningCard = memo(
	({ cleaning, userRole, onView, onEdit, onDelete }: CleaningCardProps) => {
		const isHost = userRole === 'host';
		const isCleaner = userRole === 'cleaner';

		const imageUrl = useMemo(() => {
			return mediaService.getMediaUrl(cleaning.property?.main_image_url || null, 'property-media');
		}, [cleaning.property?.main_image_url]);

		const formattedPostcode = useMemo(() => {
			return cleaning.property?.postcode?.toUpperCase();
		}, [cleaning.property?.postcode]);

		const canEdit = useMemo(() => {
			if (!isHost) {
				return false;
			}
			const STATUS_GROUPS = { CAN_EDIT: ['draft', 'requested', 'confirmed'] as const };
			return STATUS_GROUPS.CAN_EDIT.includes(
				cleaning.status as 'draft' | 'requested' | 'confirmed',
			);
		}, [cleaning.status, isHost]);

		const canCancel = useMemo(() => {
			if (!isHost) {
				return false;
			}
			const STATUS_GROUPS = { CAN_CANCEL: ['draft', 'requested', 'confirmed'] as const };
			return STATUS_GROUPS.CAN_CANCEL.includes(
				cleaning.status as 'draft' | 'requested' | 'confirmed',
			);
		}, [cleaning.status, isHost]);

		const isActive = isCleaner && cleaning.status === 'in_progress';

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
						<ImageWithFallback
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
							customLabel={isCleaner && cleaning.status === 'confirmed' ? 'assigned' : undefined}
						/>
					</div>

					{isHost && (
						<div className="absolute flex gap-1 top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
							{canEdit && (
								<Button
									variant="secondary"
									size="icon-sm"
									onClick={(e) => {
										e.stopPropagation();
										onEdit?.(cleaning.id);
									}}>
									<Pencil className="size-4" />
								</Button>
							)}
							{canCancel && (
								<Button
									variant="destructive"
									size="icon-sm"
									onClick={(e) => {
										e.stopPropagation();
										onDelete?.(cleaning.id);
									}}>
									<Trash2 className="size-4" />
								</Button>
							)}
						</div>
					)}
				</div>

				<CardHeader className="gap-1">
					<CardTitle className="text-lg font-bold truncate">
						{cleaning.property?.address_line_1}
						{cleaning.property?.address_line_2 && `, ${cleaning.property?.address_line_2}`}
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
								Scheduled Date
							</div>
							<p className="text-sm font-medium">
								{formatDate(cleaning.scheduled_start)},{' '}
								{formatDate(cleaning.scheduled_start, { variant: 'time' })}
							</p>
						</div>

						{isHost && (
							<div className="text-right">
								<div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
									<Banknote className="size-3 mt-0.5" />
									Cost
								</div>
								{cleaning.service_cost === null ? (
									<p className="text-sm font-medium text-muted-foreground">Not set</p>
								) : (
									<p className="text-sm font-medium">
										{DICT.FORMAT.CURRENCY}
										{cleaning.service_cost.toFixed(2)}
									</p>
								)}
							</div>
						)}

						{isCleaner && (
							<div className="text-right">
								<div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
									<Banknote className="size-3 mt-0.5" />
									Earnings
								</div>
								<p className="text-sm font-medium">
									{DICT.FORMAT.CURRENCY}
									{cleaning.cleaner_pay?.toFixed(2) ?? '0.00'}
								</p>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		);
	},
);
