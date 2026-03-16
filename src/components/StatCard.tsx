import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
	label: string;
	value: string | number;
	icon: LucideIcon;
	iconColor?: string;
	trend?: {
		value: number;
		isPositive: boolean;
	};
	className?: string;
}

export function StatCard({
	label,
	value,
	icon: Icon,
	iconColor = 'text-muted-foreground',
	trend,
	className,
}: StatCardProps) {
	return (
		<div className={cn('bg-card rounded-xl border shadow-sm p-4 lg:p-6 flex-between', className)}>
			<div className="space-y-2">
				<p className="text-xs font-black uppercase tracking-wider text-muted-foreground">{label}</p>
				<div className="flex items-baseline gap-2">
					<span className="text-2xl md:text-3xl font-black tabular-nums tracking-tight">
						{value}
					</span>
					{trend && (
						<span
							className={cn(
								'text-xs font-bold px-1.5 py-0.5 rounded-md',
								trend.isPositive
									? 'bg-success/10 text-success'
									: 'bg-destructive/10 text-destructive',
							)}>
							{trend.isPositive ? '+' : ''}
							{trend.value}%
						</span>
					)}
				</div>
			</div>
			<Icon className={cn('shrink-0 size-6 self-start', iconColor)} />
		</div>
	);
}
