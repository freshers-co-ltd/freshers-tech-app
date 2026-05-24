'use client';

import { Bath, Bed, Home, InfoIcon, Pencil, Trash2 } from 'lucide-react';
import { memo, useMemo } from 'react';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Property } from '@/features/properties/types';
import { mediaService } from '@/lib/mediaService';

interface PropertyCardProps {
	property: Property;
	onDelete: (id: string) => void;
	onEdit: (id: string) => void;
	onView: (id: string) => void;
}

export const PropertyCard = memo(({ property, onDelete, onEdit, onView }: PropertyCardProps) => {
	const imageUrl = useMemo(() => {
		return mediaService.getMediaUrl(property.main_image_url || null, 'property-media');
	}, [property.main_image_url]);

	const formattedPostcode = useMemo(() => {
		return property.postcode.toUpperCase();
	}, [property.postcode]);

	return (
		<Card
			className="overflow-hidden gap-4 p-0! pb-6 transition-all cursor-pointer hover:scale-103 group"
			onClick={() => onView(property.id)}>
			<div className="relative w-full h-48 overflow-hidden bg-muted">
				{imageUrl ? (
					<ImageWithFallback
						src={imageUrl}
						alt={property.address_line_1}
						className="object-cover size-full"
					/>
				) : (
					<div className="flex items-center justify-center h-full text-muted-foreground/40">
						<Home className="size-8" />
					</div>
				)}
				<div className="absolute flex gap-1 top-2 right-2 invisible group-hover:visible">
					<Button
						variant="secondary"
						size="icon-sm"
						onClick={(e) => {
							e.stopPropagation();
							onEdit(property.id);
						}}>
						<Pencil className="size-4" />
					</Button>
					<Button
						variant="destructive"
						size="icon-sm"
						onClick={(e) => {
							e.stopPropagation();
							onDelete(property.id);
						}}>
						<Trash2 className="size-4" />
					</Button>
				</div>
			</div>

			<CardHeader className="gap-1">
				<CardTitle className="text-lg font-bold truncate">
					{property.address_line_1}
					{property.address_line_2 && `, ${property.address_line_2}`}
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					{property.town_city}, {formattedPostcode}
				</p>
			</CardHeader>

			<CardContent className="pb-4">
				<div className="flex items-center justify-between border-t pt-4">
					<div className="space-y-1">
						<div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
							<InfoIcon className="size-3 mt-px" />
							Details
						</div>
						<div className="flex items-center gap-4 text-sm">
							<div className="flex items-center gap-2">
								<Bed className="size-4" />
								<span>{property.bedrooms}</span>
							</div>
							<div className="flex items-center gap-2">
								<Bath className="size-4" />
								<span>{property.bathrooms}</span>
							</div>
							<div className="flex items-center gap-2">
								<Home className="size-4" />
								<span className="capitalize">{property.type}</span>
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
});
