'use client';

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { cleaningsService } from '@/features/cleanings/services/cleaningsService';
import type { CleanerPayConfig } from '@/features/cleanings/types';

interface CleanerPayContextValue {
	config: CleanerPayConfig | null;
	refresh: () => Promise<void>;
}

const CleanerPayContext = createContext<CleanerPayContextValue | null>(null);

export function CleanerPayProvider({ children }: { children: ReactNode }) {
	const [config, setConfig] = useState<CleanerPayConfig | null>(null);
	const { user } = useAuth();

	useEffect(() => {
		if (!user) {
			setConfig(null);
			return;
		}

		let cancelled = false;
		const fetchConfig = async () => {
			const result = await cleaningsService.getCleanerPayConfig();
			if (!cancelled && result.data) {
				setConfig(result.data);
			}
		};
		fetchConfig();
		return () => {
			cancelled = true;
		};
	}, [user]);

	const refresh = async () => {
		if (!user) {
			setConfig(null);
			return;
		}
		const result = await cleaningsService.getCleanerPayConfig();
		if (result.data) {
			setConfig(result.data);
		}
	};

	return (
		<CleanerPayContext.Provider value={{ config, refresh }}>{children}</CleanerPayContext.Provider>
	);
}

export function useCleanerPayConfig(): {
	config: CleanerPayConfig | null;
	refresh: () => Promise<void>;
} {
	const ctx = useContext(CleanerPayContext);
	if (!ctx) {
		throw new Error('useCleanerPayConfig must be used within a CleanerPayProvider');
	}
	return { config: ctx.config, refresh: ctx.refresh };
}
