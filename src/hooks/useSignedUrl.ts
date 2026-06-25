'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useSignedUrl(
	path: string | null | undefined,
	bucket: string,
	expiresIn = 3600,
): string | null {
	const [signedUrl, setSignedUrl] = useState<string | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		if (!path || path.startsWith('http') || path.startsWith('blob:')) {
			setSignedUrl(path ?? null);
			return;
		}

		let cancelled = false;

		const refresh = async () => {
			const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
			if (data?.signedUrl && !cancelled) {
				setSignedUrl(data.signedUrl);
			}
		};

		refresh();

		const id = setInterval(refresh, expiresIn * 750);
		intervalRef.current = id;

		return () => {
			cancelled = true;
			clearInterval(id);
		};
	}, [path, bucket, expiresIn]);

	return signedUrl;
}
