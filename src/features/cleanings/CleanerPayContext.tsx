'use client';

import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { cleaningsService } from '@/features/cleanings/services/cleaningsService';
import type { CleanerPayConfig } from '@/features/cleanings/types';

interface CleanerPayContextValue {
	config: CleanerPayConfig | null;
	refresh: () => Promise<void>;
}

const CleanerPayContext = createContext<CleanerPayContextValue | null>(null);

export function CleanerPayProvider({ children }: { children: ReactNode }) {
	const [config, setConfig] = useState<CleanerPayConfig | null>(null);
	const fetchPromiseRef = useRef<Promise<void> | null>(null);

	useEffect(() => {
		const fetchConfig = async () => {
			const result = await cleaningsService.getCleanerPayConfig();
			if (result.data) {
				setConfig(result.data);
			}
		};

		if (!fetchPromiseRef.current) {
			fetchPromiseRef.current = fetchConfig();
		}
	}, []);

	const refresh = async () => {
		const result = await cleaningsService.getCleanerPayConfig();
		if (result.data) {
			setConfig(result.data);
		}
	};

	return (
		<CleanerPayContext.Provider value={{ config, refresh }}>{children}</CleanerPayContext.Provider>
	);
}

export function useCleanerPayConfig(): CleanerPayConfig | null {
	const ctx = useContext(CleanerPayContext);
	if (!ctx) {
		throw new Error('useCleanerPayConfig must be used within a CleanerPayProvider');
	}
	return ctx.config;
}
