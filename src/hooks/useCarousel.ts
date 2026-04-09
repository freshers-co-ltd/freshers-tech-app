import { useCallback, useState, type KeyboardEvent } from 'react';

interface UseCarouselProps {
	images: string[];
	initialImage?: string;
	isKeyboardEnabled?: boolean;
}

export function useCarousel({ images, initialImage, isKeyboardEnabled }: UseCarouselProps) {
	const [currentIndex, setCurrentIndex] = useState(() => {
		if (initialImage) {
			const index = images.indexOf(initialImage);
			return index !== -1 ? index : 0;
		}
		return 0;
	});

	const nextImage = useCallback(() => {
		if (images.length === 0) {
			return;
		}
		setCurrentIndex((prev) => (prev + 1) % images.length);
	}, [images.length]);

	const prevImage = useCallback(() => {
		if (images.length === 0) {
			return;
		}
		setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
	}, [images.length]);

	const handleKeyDown = useCallback((e: KeyboardEvent<HTMLElement>) => {
		if (!isKeyboardEnabled) {
			return;
		}
		if (e.key === 'ArrowRight') {
			nextImage();
		}
		if (e.key === 'ArrowLeft') {
			prevImage();
		}
	}, [isKeyboardEnabled, nextImage, prevImage]);

	const setActiveImage = useCallback((image: string) => {
		const index = images.indexOf(image);
		if (index !== -1) {
			setCurrentIndex(index);
		}
	}, [images]);

	return {
		activeImage: images[currentIndex],
		setActiveImage,
		currentIndex,
		nextImage,
		prevImage,
		allImages: images,
		handleKeyDown,
		containerProps: {
			tabIndex: 0,
			onKeyDown: handleKeyDown,
		},
	};
}