'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	MediaPlayer,
	MediaPlayerControls,
	MediaPlayerControlsOverlay,
	MediaPlayerError,
	MediaPlayerLoading,
	MediaPlayerPlay,
	MediaPlayerPlaybackSpeed,
	MediaPlayerSeek,
	MediaPlayerSeekBackward,
	MediaPlayerSeekForward,
	MediaPlayerTime,
	MediaPlayerVideo,
	MediaPlayerVolume,
	MediaPlayerVolumeIndicator,
} from '@/components/ui/media-player';
import { useCarousel } from '@/hooks/useCarousel';

interface MediaItem {
	url: string;
	type: 'image' | 'video';
}

interface FullscreenMediaCarouselProps {
	media: MediaItem[];
	initialMedia?: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	alt?: string;
	placeholderSrc?: string;
}

export function FullscreenMediaCarousel({
	media,
	initialMedia,
	open,
	onOpenChange,
	alt = 'Image',
	placeholderSrc = '/placeholder-property.jpg',
}: FullscreenMediaCarouselProps) {
	const urls = useMemo(() => media.map((m) => m.url), [media]);
	const safeMedia = useMemo(
		() => (media.length > 0 ? media : [{ url: '', type: 'image' as const }]),
		[media],
	);

	const { currentIndex, nextImage, prevImage, setActiveImage } = useCarousel({
		images: urls,
		initialImage: initialMedia || safeMedia[0]?.url,
		isKeyboardEnabled: open,
	});

	useEffect(() => {
		if (initialMedia) {
			setActiveImage(initialMedia);
		}
	}, [initialMedia, setActiveImage]);

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
			<DialogContent className="min-w-full max-w-screen h-dvh p-0 bg-background border-none flex flex-col items-center justify-center overflow-hidden rounded-none shadow-none [&>button]:hidden">
				<DialogHeader className="hidden">
					<DialogTitle className="sr-only">Fullscreen view</DialogTitle>
					<DialogDescription className="sr-only">
						Viewing media {currentIndex + 1} of {safeMedia.length}.
					</DialogDescription>
				</DialogHeader>

				<div className="absolute top-4 right-4 z-60">
					<Button
						variant="ghost"
						size="icon"
						className="rounded-full shadow-md size-10 bg-background/50 backdrop-blur-md"
						onClick={handleClose}>
						<X className="size-5" />
					</Button>
				</div>

				{safeMedia.length > 1 && (
					<div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-1.5 rounded-full shadow-md bg-background/50 backdrop-blur-md">
						<Button variant="link" size="icon" className="text-foreground" onClick={handlePrev}>
							<ChevronLeft className="size-5" />
						</Button>
						<div className="px-2 text-sm font-semibold">
							{currentIndex + 1} / {safeMedia.length}
						</div>
						<Button variant="link" size="icon" className="text-foreground" onClick={handleNext}>
							<ChevronRight className="size-5" />
						</Button>
					</div>
				)}

				<div className="flex-1 w-full h-full flex items-center justify-center">
					{safeMedia[currentIndex]?.type === 'video' ? (
						<MediaPlayer key={currentIndex} className="w-full max-h-full">
							<MediaPlayerVideo>
								<source src={safeMedia[currentIndex]?.url} type="video/mp4" />
							</MediaPlayerVideo>
							<MediaPlayerLoading />
							<MediaPlayerError />
							<MediaPlayerVolumeIndicator />
							<MediaPlayerControls className="flex-col items-start">
								<MediaPlayerControlsOverlay />
								<MediaPlayerSeek />
								<div className="flex w-full items-center">
									<div className="flex flex-1 items-center gap-2">
										<MediaPlayerPlay />
										<MediaPlayerSeekBackward />
										<MediaPlayerSeekForward />
										<MediaPlayerVolume expandable />
										<MediaPlayerTime />
									</div>
									<div className="flex items-center gap-2">
										<MediaPlayerPlaybackSpeed />
									</div>
								</div>
							</MediaPlayerControls>
						</MediaPlayer>
					) : (
						<img
							src={safeMedia[currentIndex]?.url ?? ''}
							className="w-full h-full object-contain select-none"
							alt={`${alt} ${currentIndex + 1}`}
							onError={(e) => {
								(e.target as HTMLImageElement).src = placeholderSrc;
							}}
						/>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
