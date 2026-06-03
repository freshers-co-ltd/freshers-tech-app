'use client';

import { useEffect, useRef } from 'react';

export function useObjectUrls(files: File[] | null | undefined): string[] {
	const urlsRef = useRef<string[]>([]);

	useEffect(() => {
		return () => {
			urlsRef.current.forEach(URL.revokeObjectURL);
		};
	}, []);

	useEffect(() => {
		urlsRef.current.forEach(URL.revokeObjectURL);
		urlsRef.current = files?.map(URL.createObjectURL) ?? [];
	}, [files]);

	return urlsRef.current;
}
