'use client';

import { Bath, Bed, Home, Pencil, Trash2 } from 'lucide-react';
import { memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DICT } from '@/dictionary';
import type { Property } from '@/features/properties/propertyService';
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
			className="overflow-hidden gap-4 p-0 pb-6 transition-all cursor-pointer hover:scale-103 group"
			onClick={() => onView(property.id)}>
			<div className="relative w-full h-60 overflow-hidden bg-muted">
				{property.main_image_url ? (
					<img src={imageUrl} alt={property.address_line_1} className="object-cover size-full" />
				) : (
					<div className="flex-center h-full">
						<Home className="size-12 text-muted-foreground/20" />
					</div>
				)}
				<div className="absolute flex gap-1 top-2 right-2 invisible group-hover:visible">
					<Button
						variant="secondary"
						size="icon"
						className="size-8"
						onClick={(e) => {
							e.stopPropagation();
							onEdit(property.id);
						}}>
						<Pencil className="size-4" />
					</Button>
					<Button
						variant="destructive"
						size="icon"
						className="size-8"
						onClick={(e) => {
							e.stopPropagation();
							onDelete(property.id);
						}}>
						<Trash2 className="size-4" />
					</Button>
				</div>
			</div>

			<CardHeader className="pb-2">
				<CardTitle className="text-lg font-bold truncate">
					{property.address_line_1}
					{property.address_line_2 && (
						<p className="text-muted-foreground truncate">{property.address_line_2}</p>
					)}
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					{property.town_city}, {formattedPostcode}
				</p>
			</CardHeader>
			<CardContent className="pt-4">
				<div className="flex items-center gap-6 text-sm text-muted-foreground">
					<div className="flex items-center gap-2">
						<Bed className="size-4" />
						<span>
							{property.bedrooms} {DICT.COMMON.LABELS.BEDS}
						</span>
					</div>
					<div className="flex items-center gap-2">
						<Bath className="size-4" />
						<span>
							{property.bathrooms} {DICT.COMMON.LABELS.BATHS}
						</span>
					</div>
				</div>
			</CardContent>
			<CardFooter className="pt-0 text-xs capitalize text-muted-foreground">
				{DICT.COMMON.LABELS.TYPE}: {property.type}
			</CardFooter>
		</Card>
	);
});
