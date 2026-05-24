'use client';

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import { toast } from '@/components/Toast';
import { useAuth } from '@/features/auth/AuthContext';
import { propertyService } from '@/features/properties/propertyService';
import type { Property, PropertyInsert } from '@/features/properties/types';

interface PropertyContextType {
	properties: Property[];
	isLoading: boolean;
	fetchProperties: () => Promise<void>;
	upsertProperty: (property: PropertyInsert) => Promise<{ success: boolean; data?: Property }>;
	deleteProperty: (id: string, hard?: boolean) => Promise<{ success: boolean }>;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export function PropertyProvider({ children }: { children: ReactNode }) {
	const [properties, setProperties] = useState<Property[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const { user, profile } = useAuth();
	const abortControllerRef = useRef<AbortController | null>(null);

	const fetchProperties = useCallback(
		async (signal?: AbortSignal) => {
			if (!user) {
				setProperties([]);
				setIsLoading(false);
				return;
			}

			setIsLoading(true);
			const { data, error } = await propertyService.getProperties();

			if (signal?.aborted) {
				return;
			}

			if (error) {
				toast.error(error);
			} else if (data) {
				setProperties(data);
			}

			setIsLoading(false);
		},
		[user],
	);

	useEffect(() => {
		if (user && profile?.role === 'host') {
			abortControllerRef.current?.abort();
			abortControllerRef.current = new AbortController();
			fetchProperties(abortControllerRef.current.signal);
		} else if (user && profile) {
			setIsLoading(false);
		}

		return () => {
			abortControllerRef.current?.abort();
		};
	}, [user, profile, fetchProperties]);

	const upsertProperty = async (property: PropertyInsert) => {
		const { data, error } = await propertyService.upsertProperty(property);
		if (error) {
			toast.error(error);
			return { success: false };
		}

		if (data) {
			setProperties((prev) => {
				const exists = prev.find((p) => p.id === data.id);
				return exists ? prev.map((p) => (p.id === data.id ? data : p)) : [data, ...prev];
			});
			return { success: true, data };
		}
		return { success: false };
	};

	const deleteProperty = async (id: string, hard: boolean = false) => {
		const { error } = hard
			? await propertyService.hardDeleteProperty(id)
			: await propertyService.softDeleteProperty(id);

		if (error) {
			toast.error(error);
			return { success: false };
		}
		setProperties((prev) => prev.filter((p) => p.id !== id));
		return { success: true };
	};

	return (
		<PropertyContext.Provider
			value={{
				properties,
				isLoading,
				fetchProperties,
				upsertProperty,
				deleteProperty,
			}}>
			{children}
		</PropertyContext.Provider>
	);
}

export const useProperties = () => {
	const context = useContext(PropertyContext);
	if (!context) {
		throw new Error('useProperties must be used within PropertyProvider');
	}
	return context;
};
