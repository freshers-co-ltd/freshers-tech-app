'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

interface SortIconProps {
	currentField: string;
	sortField: string;
	sortDirection: 'asc' | 'desc';
	onClick: () => void;
	className?: string;
}

export function SortIcon({
	currentField,
	sortField,
	sortDirection,
	onClick,
	className,
}: SortIconProps) {
	const isActive = sortField === currentField;

	return (
		<button
			type="button"
			className={`flex items-center gap-1 hover:cursor-pointer ${className || ''}`}
			onClick={onClick}>
			{isActive ? (
				sortDirection === 'asc' ? (
					<ArrowUp className="size-3" />
				) : (
					<ArrowDown className="size-3" />
				)
			) : (
				<ArrowUpDown className="size-3" />
			)}
		</button>
	);
}
