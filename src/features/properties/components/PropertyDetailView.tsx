'use client';

import { Bath, Bed, MapPin, Maximize2, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FullscreenMediaCarousel } from '@/components/FullscreenMediaCarousel';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { Button } from '@/components/ui/button';
import {
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { DICT } from '@/dictionary';
import { useAuth } from '@/features/auth/AuthContext';
import type { Property } from '@/features/properties/types';
import { useCarousel } from '@/hooks/useCarousel';
import { useMediaUrl } from '@/hooks/useMediaUrl';
import { mediaService } from '@/lib/mediaService';
import { formatPostcode } from '@/lib/utils';

interface PropertyDetailViewProps {
	property: Property;
	onEdit: (id: string) => void;
	onDelete: (id: string) => void;
}

export function PropertyDetailView({ property, onEdit, onDelete }: PropertyDetailViewProps) {
	const { user } = useAuth();
	const [isFullScreen, setIsFullScreen] = useState(false);
	const [extraImageUrls, setExtraImageUrls] = useState<string[]>([]);

	const mainImageUrl = useMediaUrl(property.main_image_url, 'property-media');

	useEffect(() => {
		const paths = property.extra_images_urls;
		if (!paths || paths.length === 0) {
			setExtraImageUrls([]);
			return;
		}

		let cancelled = false;

		Promise.all(paths.map(async (path) => mediaService.getSignedUrl(path, 'property-media'))).then(
			(results) => {
				if (!cancelled) {
					setExtraImageUrls(results.map((url) => url ?? '/placeholder-image.webp'));
				}
			},
		);

		return () => {
			cancelled = true;
		};
	}, [property.extra_images_urls]);

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
