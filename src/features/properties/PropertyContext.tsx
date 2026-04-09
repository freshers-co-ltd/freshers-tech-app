'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthContext';
import {
	type Property,
	type PropertyInsert,
	propertyService,
} from '@/features/properties/propertyService';

interface PropertyContextType {
	properties: Property[];
	isLoading: boolean;
	fetchProperties: () => Promise<void>;
	upsertProperty: (property: PropertyInsert) => Promise<{ success: boolean; data?: Property }>;
	deleteProperty: (id: string) => Promise<{ success: boolean }>;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export function PropertyProvider({ children }: { children: ReactNode }) {
	const [properties, setProperties] = useState<Property[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const { user, profile } = useAuth();

	const fetchProperties = useCallback(async () => {
		if (!user) {
			setProperties([]);
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		const { data, error } = await propertyService.getProperties();

		if (error) {
			toast.error(error);
		} else if (data) {
			setProperties(data);
		}

		setIsLoading(false);
	}, [user]);

	useEffect(() => {
		if (user && profile?.role === 'host') {
			fetchProperties();
		} else if (user && profile) {
			setIsLoading(false);
		}
	}, [user, profile, fetchProperties]);

	const upsertProperty = async (property: PropertyInsert) => {
		const { data, error } = await propertyService.upsertProperty(property);
		if (error) {
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

	const deleteProperty = async (id: string) => {
		const { error } = await propertyService.deleteProperty(id);
		if (error) {
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
