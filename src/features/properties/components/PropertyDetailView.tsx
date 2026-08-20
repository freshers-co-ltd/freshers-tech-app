'use client';

import { Bath, Bed, MapPin, Maximize2, Pencil, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { FullscreenMediaCarousel } from '@/components/FullscreenMediaCarousel';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { toast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import {
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { TimeInput } from '@/components/ui/time-input';
import { DICT } from '@/dictionary';
import { useAuth } from '@/features/auth/AuthContext';
import { IcalFeedManager } from '@/features/ical/components/IcalFeedManager';
import { useProperties } from '@/features/properties/PropertyContext';
import type { Property } from '@/features/properties/types';
import { useCarousel } from '@/hooks/useCarousel';
import { useMediaUrl } from '@/hooks/useMediaUrl';
import { useMediaUrls } from '@/hooks/useMediaUrls';
import { formatPostcode } from '@/lib/utils';

interface PropertyDetailViewProps {
	property: Property;
	onEdit: (id: string) => void;
	onDelete: (id: string) => void;
}

export function PropertyDetailView({ property, onEdit, onDelete }: PropertyDetailViewProps) {
	const { user } = useAuth();
	const { upsertProperty } = useProperties();
	const [isFullScreen, setIsFullScreen] = useState(false);
	const [defaultCleaningTime, setDefaultCleaningTime] = useState(
		property.default_cleaning_time?.slice(0, 5) ?? '11:00',
	);

	const mainImageUrl = useMediaUrl(property.main_image_url, 'property-media');
	const extraImageUrls = useMediaUrls(property.extra_images_urls, 'property-media');

	const images = useMemo(
		() => [mainImageUrl || '/placeholder-image.webp', ...extraImageUrls],
		[mainImageUrl, extraImageUrls],
	);

	const { activeImage, setActiveImage, allImages } = useCarousel({
		images,
		initialImage: mainImageUrl || '/placeholder-image.webp',
		isKeyboardEnabled: isFullScreen,
	});

	const canManage = user?.user_metadata?.role === 'host' || user?.user_metadata?.role === 'admin';

	const handleDefaultTimeChange = useCallback((value: string) => {
		setDefaultCleaningTime(value);
	}, []);

	const handleDefaultTimeClose = useCallback(async () => {
		const currentValue = property.default_cleaning_time?.slice(0, 5) ?? '11:00';
		if (defaultCleaningTime === currentValue) {
			return;
		}
		const result = await upsertProperty(
			{
				id: property.id,
				created_at: property.created_at,
				host_id: property.host_id,
				address_line_1: property.address_line_1,
				address_line_2: property.address_line_2,
				town_city: property.town_city,
				postcode: property.postcode,
				type: property.type,
				bedrooms: property.bedrooms,
				bathrooms: property.bathrooms,
				main_image_url: property.main_image_url,
				extra_images_urls: property.extra_images_urls,
				default_cleaning_time: defaultCleaningTime,
			},
			{ silent: true },
		);
		if (result.success) {
			toast.success(DICT.PROPERTIES.DEFAULT_TIME_SAVED);
		} else {
			toast.error(DICT.ERRORS.COMMON.GENERIC);
		}
	}, [property, defaultCleaningTime, upsertProperty]);

	return (
		<DialogContent className="max-w-5xl! w-screen sm:w-full h-[95svh] flex flex-col p-0 overflow-hidden">
			<div className="relative flex-1 min-h-0">
				<ScrollArea className="h-full w-full">
					<div className="p-4 sm:p-6 space-y-6 max-w-screen">
						<DialogHeader>
							<DialogTitle className="wrap-break-word text-xl font-bold leading-tight">
								{property.address_line_1}
								{property.address_line_2 && (
									<span className="text-muted-foreground">, {property.address_line_2}</span>
								)}
							</DialogTitle>
							<DialogDescription className="sr-only">Property details</DialogDescription>
							<div className="flex items-center gap-1 text-muted-foreground text-sm">
								<MapPin className="size-4 shrink-0" />
								<span className="truncate">
									{property.town_city}, {formatPostcode(property.postcode)}
								</span>
							</div>
						</DialogHeader>

						<div className="flex flex-col lg:flex-row gap-4 overflow-hidden">
							<div className="relative aspect-video lg:flex-1 bg-muted rounded-lg overflow-hidden shrink-0 lg:shrink">
								<ImageWithFallback
									key={activeImage}
									src={activeImage}
									className="size-full object-contain"
									alt="Property"
								/>
								<Button
									size="icon"
									variant="secondary"
									className="absolute bottom-2 right-2"
									onClick={() => setIsFullScreen(true)}>
									<Maximize2 className="size-4" />
								</Button>
							</div>

							<div className="w-full lg:w-24 max-w-full overflow-hidden shrink-0">
								<ScrollArea className="w-full">
									<div className="flex lg:flex-col gap-2 p-1">
										{allImages.map((url) => (
											<Button
												key={url}
												variant="outline"
												onClick={() => setActiveImage(url)}
												className={`p-0 size-16 lg:w-full shrink-0 overflow-hidden transition-all ${
													activeImage === url ? 'ring-2 ring-primary border-primary' : 'opacity-70'
												}`}>
												<ImageWithFallback
													src={url}
													className="size-full object-cover"
													alt="Thumbnail"
												/>
											</Button>
										))}
									</div>
									<ScrollBar orientation="horizontal" className="lg:hidden" />
								</ScrollArea>
							</div>
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
							<div className="lg:col-span-2 space-y-4 border rounded-lg p-4">
								<p className="font-bold capitalize">{property.type}</p>
								<div className="flex gap-4">
									<div className="flex items-center gap-2">
										<Bed className="size-4" /> <span>{property.bedrooms}</span>
									</div>
									<div className="flex items-center gap-2">
										<Bath className="size-4" /> <span>{property.bathrooms}</span>
									</div>
								</div>
							</div>

							{canManage && (
								<div className="flex flex-col gap-2">
									<Button onClick={() => onEdit(property.id)} className="w-full">
										<Pencil className="mr-1 size-4" /> {DICT.COMMON.ACTIONS.EDIT}
									</Button>
									<Button
										variant="destructive"
										onClick={() => onDelete(property.id)}
										className="w-full">
										<Trash2 className="mr-1 size-4" /> {DICT.COMMON.ACTIONS.DELETE}
									</Button>
								</div>
							)}
						</div>

						{canManage && (
							<div className="border rounded-lg p-4 space-y-4">
								<div>
									<h3 className="font-bold">{DICT.ICAL.TITLE}</h3>
									<p className="text-sm text-muted-foreground">{DICT.ICAL.MESSAGE}</p>
								</div>
								<div className="space-y-2">
									<p className="text-sm font-medium">{DICT.COMMON.LABELS.DEFAULT_CLEANING_TIME}</p>
									<TimeInput
										value={defaultCleaningTime}
										onChange={handleDefaultTimeChange}
										onClose={handleDefaultTimeClose}
									/>
									<p className="text-xs text-muted-foreground">{DICT.PROPERTIES.TIME_HELP}</p>
								</div>
								<IcalFeedManager propertyId={property.id} />
							</div>
						)}
					</div>
				</ScrollArea>
			</div>

			<FullscreenMediaCarousel
				media={allImages.map((url) => ({ url, type: 'image' as const }))}
				initialMedia={activeImage}
				open={isFullScreen}
				onOpenChange={setIsFullScreen}
				alt="Property"
			/>
		</DialogContent>
	);
}
