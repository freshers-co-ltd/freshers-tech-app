'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import { ImageWithFallback } from './ImageWithFallback';

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
}

export function FullscreenMediaCarousel({
	media,
	initialMedia,
	open,
	onOpenChange,
	alt = 'Image',
}: FullscreenMediaCarouselProps) {
	const urls = useMemo(() => media.map((m) => m.url), [media]);
	const safeMedia = useMemo(
		() => (media.length > 0 ? media : [{ url: '', type: 'image' as const }]),
		[media],
	);

	const [videoErrors, setVideoErrors] = useState<Set<number>>(new Set());

	const { currentIndex, nextImage, prevImage, setActiveImage } = useCarousel({
		images: urls,
		initialImage: initialMedia || safeMedia[0]?.url,
		isKeyboardEnabled: open,
	});

	const currentVideoHasErrored = videoErrors.has(currentIndex);

	useEffect(() => {
		if (initialMedia) {
			setActiveImage(initialMedia);
		}
	}, [initialMedia, setActiveImage]);

	useEffect(() => {
		if (!open) {
			return;
		}

		const originalMeta = document.querySelector('meta[name="theme-color"]');
		const originalColor = originalMeta ? originalMeta.getAttribute('content') : null;

		let meta = originalMeta;
		if (!meta) {
			meta = document.createElement('meta');
			meta.setAttribute('name', 'theme-color');
			document.head.appendChild(meta);
		}

		meta.setAttribute('content', '#000000');
		document.documentElement.style.backgroundColor = '#000000';
		document.body.style.backgroundColor = '#000000';

		return () => {
			if (originalColor) {
				meta?.setAttribute('content', originalColor);
			} else {
				meta?.remove();
			}
			document.documentElement.style.backgroundColor = '';
			document.body.style.backgroundColor = '';
		};
	}, [open]);

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
			<DialogContent className="min-w-full max-w-screen h-dvh p-0 bg-black border-none flex flex-col items-center justify-center overflow-hidden rounded-none shadow-none [&>button]:hidden">
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
					<div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-1 rounded-full shadow-md bg-background/50 backdrop-blur-md">
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
					{safeMedia[currentIndex]?.type === 'video' && !currentVideoHasErrored ? (
						<MediaPlayer
							key={currentIndex}
							className="w-full max-h-full"
							onMediaError={() => {
								setVideoErrors((prev) => new Set(prev).add(currentIndex));
							}}>
							<MediaPlayerVideo className="bg-black">
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
						<ImageWithFallback
							src={safeMedia[currentIndex]?.url ?? ''}
							className="w-full h-full object-contain select-none"
							alt={`${alt} ${currentIndex + 1}`}
						/>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
