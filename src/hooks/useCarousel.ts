import { useCallback, useEffect, useState } from 'react';

interface UseCarouselProps {
	images: string[];
	initialImage?: string;
	isKeyboardEnabled?: boolean;
}

export function useCarousel({ images, initialImage, isKeyboardEnabled }: UseCarouselProps) {
	const [activeImage, setActiveImage] = useState<string | undefined>(initialImage || images[0]);

	useEffect(() => {
		if (initialImage) {
			setActiveImage(initialImage);
		} else if (images.length > 0) {
			setActiveImage(images[0]);
		}
	}, [initialImage, images]);

	const currentIndex = activeImage ? images.indexOf(activeImage) : -1;

	const nextImage = useCallback(() => {
		if (images.length === 0) {
			return;
		}
		const nextIdx = (currentIndex + 1) % images.length;
		setActiveImage(images[nextIdx]);
	}, [currentIndex, images]);

	const prevImage = useCallback(() => {
		if (images.length === 0) {
			return;
		}
		const prevIdx = (currentIndex - 1 + images.length) % images.length;
		setActiveImage(images[prevIdx]);
	}, [currentIndex, images]);

	useEffect(() => {
		if (!isKeyboardEnabled) {
			return;
		}
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'ArrowRight') {
				nextImage();
			}
			if (e.key === 'ArrowLeft') {
				prevImage();
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isKeyboardEnabled, nextImage, prevImage]);

	return {
		activeImage,
		setActiveImage,
		currentIndex,
		nextImage,
		prevImage,
		allImages: images,
	};
}
