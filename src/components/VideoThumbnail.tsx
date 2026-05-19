'use client';

import { Play } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface VideoThumbnailProps {
	src: string;
	className?: string;
}

export function VideoThumbnail({ src, className = 'size-full' }: VideoThumbnailProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [poster, setPoster] = useState<string | null>(null);

	const captureFrame = useCallback(() => {
		const video = videoRef.current;
		if (!video || video.readyState < 2) {
			return;
		}

		try {
			const canvas = document.createElement('canvas');
			canvas.width = 320;
			canvas.height = 180;
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				return;
			}
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
			setPoster(canvas.toDataURL('image/webp', 0.7));
		} catch {
			// Frame capture failed, continue showing video element
		}
	}, []);

	const handleLoadedMetadata = useCallback(() => {
		const video = videoRef.current;
		if (!video) {
			return;
		}
		video.currentTime = 0.1;
	}, []);

	const handleSeeked = useCallback(() => {
		captureFrame();
	}, [captureFrame]);

	return (
		<div className={`relative overflow-hidden ${className}`}>
			{poster ? (
				<img src={poster} alt="Video thumbnail" className="size-full object-cover" />
			) : (
				<video
					ref={videoRef}
					src={src}
					className="size-full object-cover"
					muted
					playsInline
					preload="metadata"
					onLoadedMetadata={handleLoadedMetadata}
					onSeeked={handleSeeked}>
					<track kind="captions" />
				</video>
			)}
			<div className="absolute inset-0 flex items-center justify-center">
				<div className="flex size-10 items-center justify-center rounded-full bg-white/70 shadow-md">
					<Play className="size-5 fill-primary text-primary ml-0.5" />
				</div>
			</div>
		</div>
	);
}
