'use client';

import { type ImgHTMLAttributes, useEffect, useState } from 'react';

interface ImageWithFallbackProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'onError'> {
	fallbackSrc?: string;
}

export function ImageWithFallback({
	src,
	fallbackSrc = '/placeholder-image.webp',
	alt,
	...props
}: ImageWithFallbackProps) {
	const [imgSrc, setImgSrc] = useState<string>(src || fallbackSrc);

	useEffect(() => {
		setImgSrc(src || fallbackSrc);
	}, [src, fallbackSrc]);

	const handleError = () => {
		if (imgSrc !== fallbackSrc) {
			setImgSrc(fallbackSrc);
		}
	};

	return <img {...props} src={imgSrc} alt={alt} onError={handleError} />;
}
