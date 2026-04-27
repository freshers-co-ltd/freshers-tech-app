'use client';

import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

export interface AdminStatsCardProps {
	label: string;
	value: string | number;
	icon: LucideIcon;
	iconColor?: string;
	trend?: string;
	trendUp?: boolean;
}

export function AdminStatsCard({
	label,
	value,
	icon: Icon,
	iconColor = 'text-primary',
	trend,
	trendUp,
}: AdminStatsCardProps) {
	return (
		<Card className="p-4">
			<div className="flex items-center gap-3">
				<div className={`p-2 bg-primary/10 rounded-lg`}>
					<Icon className={`size-5 ${iconColor}`} />
				</div>
				<div>
					<p className="text-2xl font-bold">{value}</p>
					<p className="text-xs text-muted-foreground">{label}</p>
				</div>
			</div>
			{trend && (
				<div className="mt-2 text-xs">
					<span className={trendUp ? 'text-green-600' : 'text-muted-foreground'}>{trend}</span>
				</div>
			)}
		</Card>
	);
}
