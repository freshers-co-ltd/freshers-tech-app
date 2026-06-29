'use client';

import { PropertyCard } from '@/features/properties/components/PropertyCard';
import { useProperties } from '@/features/properties/PropertyContext';

interface PropertyManagementGridProps {
	onView: (id: string) => void;
	onEdit: (id: string) => void;
	onDelete: (id: string) => void;
}

export function PropertyManagementGrid({ onView, onEdit, onDelete }: PropertyManagementGridProps) {
	const { properties } = useProperties();

	return (
		<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
			{properties.map((property) => (
				<PropertyCard
					key={property.id}
					property={property}
					onView={onView}
					onEdit={onEdit}
					onDelete={onDelete}
				/>
			))}
		</div>
	);
}
