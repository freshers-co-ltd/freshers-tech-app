'use client';

import { useEffect, useState } from 'react';

export function useObjectUrls(files: File[] | null | undefined): string[] {
	const [urls, setUrls] = useState<string[]>([]);

	useEffect(() => {
		const newUrls = files?.map(URL.createObjectURL) ?? [];
		setUrls(newUrls);

		return () => {
			newUrls.forEach(URL.revokeObjectURL);
		};
	}, [files]);

	return urls;
}
