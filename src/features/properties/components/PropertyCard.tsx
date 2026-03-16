'use client';

import { Bath, Bed, Home, Pencil, Trash2 } from 'lucide-react';
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

export function PropertyCard({ property, onDelete, onEdit, onView }: PropertyCardProps) {
	return (
		<Card
			className="overflow-hidden gap-4 p-0 pb-6 transition-all cursor-pointer hover:scale-103 group"
			onClick={() => onView(property.id)}>
			<div className="relative w-full h-60 overflow-hidden bg-muted">
				{property.main_image_url ? (
					<img
						src={mediaService.getMediaUrl(property.main_image_url || null, 'property-media')}
						alt={property.address_line_1}
						className="object-cover size-full"
					/>
				) : (
					<div className="flex-center h-full">
						<Home className="size-12 text-muted-foreground/20" />
					</div>
				)}
				<div className="absolute flex gap-1 top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
					{property.town_city}, {property.postcode.toUpperCase()}
				</p>
			</CardHeader>
			<CardContent className="pt-4">
				<div className="flex items-center gap-6 text-sm text-muted-foreground">
					<div className="flex items-center gap-2">
						<Bed className="size-4" />
						<span>
							{property.bedrooms} {DICT.PROPERTIES.LABELS.BEDS}
						</span>
					</div>
					<div className="flex items-center gap-2">
						<Bath className="size-4" />
						<span>
							{property.bathrooms} {DICT.PROPERTIES.LABELS.BATHS}
						</span>
					</div>
				</div>
			</CardContent>
			<CardFooter className="pt-0 text-xs capitalize text-muted-foreground">
				{DICT.PROPERTIES.LABELS.TYPE}: {property.type}
			</CardFooter>
		</Card>
	);
}
