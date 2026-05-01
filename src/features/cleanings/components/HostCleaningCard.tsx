'use client';

import { format } from 'date-fns';
import { Banknote, Calendar, ClipboardCheck, MapPin, Pencil, Trash2 } from 'lucide-react';
import { memo, useMemo } from 'react';
import { EntityBadge } from '@/components/EntityBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DICT } from '@/dictionary';
import { type CleaningRequest, STATUS_GROUPS } from '@/features/cleanings/cleaningService';
import { mediaService } from '@/lib/mediaService';

interface HostCleaningCardProps {
	cleaning: CleaningRequest;
	onDelete: (id: string) => void;
	onEdit: (id: string) => void;
	onView: (id: string) => void;
}

export const HostCleaningCard = memo(
	({ cleaning, onDelete, onEdit, onView }: HostCleaningCardProps) => {
		const imageUrl = useMemo(() => {
			return mediaService.getMediaUrl(cleaning.property?.main_image_url || null, 'property-media');
		}, [cleaning.property?.main_image_url]);

		const canEdit = useMemo(() => {
			return STATUS_GROUPS.CAN_EDIT.includes(cleaning.status);
		}, [cleaning.status]);

		const canCancel = useMemo(() => {
			return STATUS_GROUPS.CAN_CANCEL.includes(cleaning.status);
		}, [cleaning.status]);

		const formattedPostcode = useMemo(() => {
			return cleaning.property?.postcode?.toUpperCase();
		}, [cleaning.property?.postcode]);

		return (
			<Card
				className="overflow-hidden p-0 gap-4 transition-all cursor-pointer hover:scale-103 group relative"
				onClick={(e) => {
					e.stopPropagation();
					onView(cleaning.id);
				}}>
				<div className="relative w-full h-60 overflow-hidden bg-muted">
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

					<div className="absolute flex gap-1 top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
						{canEdit && (
							<Button
								variant="secondary"
								size="icon"
								className="size-8"
								onClick={(e) => {
									e.stopPropagation();
									onEdit(cleaning.id);
								}}>
								<Pencil className="size-4" />
							</Button>
						)}
						{canCancel && (
							<Button
								variant="destructive"
								size="icon"
								className="size-8"
								onClick={(e) => {
									e.stopPropagation();
									onDelete(cleaning.id);
								}}>
								<Trash2 className="size-4" />
							</Button>
						)}
					</div>
				</div>

				<CardHeader className="pb-2">
					<div className="absolute top-2 left-2">
						<EntityBadge variant={{ type: 'cleaning', value: cleaning.status }} />
					</div>
					<CardTitle className="text-lg font-bold truncate">
						{cleaning.property?.address_line_1}
						{cleaning.property?.address_line_2 && `, ${cleaning.property?.address_line_2}`}
					</CardTitle>
					<p className="text-sm text-muted-foreground">
						{cleaning.property?.town_city}, {formattedPostcode}
					</p>
				</CardHeader>

				<CardContent className="space-y-4">
					<div className="grid grid-cols-2 gap-4 border-t pt-2">
						<div className="space-y-1">
							<div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
								<Calendar className="size-3" />
								Scheduled Date
							</div>
							<p className="text-sm font-medium">
								{format(new Date(cleaning.scheduled_start), 'MMM d, yyyy')}
							</p>
						</div>
						<div className="space-y-1">
							<div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
								<Banknote className="size-3" />
								Cost
							</div>
							<p className="text-sm font-bold text-primary">
								{DICT.FORMAT.CURRENCY}
								{cleaning.service_cost}
							</p>
						</div>
					</div>
				</CardContent>

				<CardFooter className="pt-0 pb-4">
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<ClipboardCheck className="size-3" />
						Requested on {format(new Date(cleaning.created_at), 'dd/MM/yy')}
					</div>
				</CardFooter>
			</Card>
		);
	},
);
