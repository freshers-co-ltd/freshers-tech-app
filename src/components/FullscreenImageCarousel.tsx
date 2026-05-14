'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useMemo } from 'react';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { useCarousel } from '@/hooks/useCarousel';

interface FullscreenImageCarouselProps {
	images: string[];
	initialImage?: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	alt?: string;
	placeholderSrc?: string;
}

export function FullscreenImageCarousel({
	images,
	initialImage,
	open,
	onOpenChange,
	alt = 'Image',
	placeholderSrc = '/placeholder-image.webp',
}: FullscreenImageCarouselProps) {
	const imageList = useMemo(() => {
		return images.length > 0 ? images : [''];
	}, [images]);

	const { currentIndex, nextImage, prevImage } = useCarousel({
		images: imageList,
		initialImage: initialImage || images[0],
		isKeyboardEnabled: open,
	});

	const handleClose = () => onOpenChange(false);

	const handlePrev = (e: React.MouseEvent) => {
		e.stopPropagation();
		prevImage();
	};

	const handleNext = (e: React.MouseEvent) => {
		e.stopPropagation();
		nextImage();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-7xl! w-[95vw] h-[90vh] p-0 bg-card border-none flex flex-col items-center justify-start overflow-hidden rounded-lg shadow-xl [&>button]:hidden">
				<DialogHeader>
					<DialogTitle className="sr-only">Fullscreen view</DialogTitle>
					<DialogDescription className="sr-only">
						Viewing image {currentIndex + 1} of {imageList.length}.
					</DialogDescription>
				</DialogHeader>

				<div className="absolute top-0 right-0 z-50 p-6">
					<Button
						variant="ghost"
						size="icon"
						className="rounded-full shadow-sm size-10 bg-background/80 backdrop-blur-md"
						onClick={handleClose}>
						<X className="size-5" />
					</Button>
				</div>

				{imageList.length > 1 && (
					<div className="absolute left-0 right-0 z-50 px-6 flex-center bottom-5">
						<div className="flex items-center gap-4 p-1 border rounded-xl shadow-lg bg-background/80 backdrop-blur-md">
							<Button variant="ghost" size="icon" className="size-10" onClick={handlePrev}>
								<ChevronLeft className="size-6" />
							</Button>
							<div className="px-2 text-sm font-semibold text-muted-foreground">
								{currentIndex + 1} / {imageList.length}
							</div>
							<Button variant="ghost" size="icon" className="size-10" onClick={handleNext}>
								<ChevronRight className="size-6" />
							</Button>
						</div>
					</div>
				)}

				<div className="relative flex-col-center size-full">
					<ImageWithFallback
						src={imageList[currentIndex]}
						className="relative z-10 object-contain w-full max-h-[85dvh] select-none"
						alt={`${alt} ${currentIndex + 1}`}
						fallbackSrc={placeholderSrc}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
