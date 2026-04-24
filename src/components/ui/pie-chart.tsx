'use client';

import { Cell, Pie, PieChart, Tooltip } from 'recharts';

import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { cn } from '@/lib/utils';

const DEFAULT_COLORS = [
	'var(--color-chart-1)',
	'var(--color-chart-2)',
	'var(--color-chart-3)',
	'var(--color-chart-4)',
	'var(--color-chart-5)',
];

export interface PieChartData {
	name: string;
	value: number;
}

export interface PieChartEntry {
	name: string;
	value: number;
	fill?: string;
}

export interface PieChartProps {
	title?: string;
	subtitle?: string;
	data: PieChartEntry[];
	showLegend?: boolean;
	className?: string;
	formatLabels?: boolean;
}

function formatLabel(label: string): string {
	return label.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PieChartComponent({
	title,
	subtitle,
	data,
	showLegend = true,
	className,
	formatLabels = true,
}: PieChartProps) {
	const config = data.reduce(
		(acc, entry, index) => {
			acc[entry.name] = {
				label: formatLabels ? formatLabel(entry.name) : entry.name,
				color:
					entry.fill ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length] ?? 'var(--color-chart-1)',
			};
			return acc;
		},
		{} as Record<string, { label: string; color: string }>,
	);

	return (
		<div className={cn('flex flex-col p-4', className)}>
			{(title || subtitle) && (
				<div className="mb-4">
					{title && <h3 className="text-lg font-semibold">{title}</h3>}
					{subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
				</div>
			)}
			<div className="flex-1 flex items-center justify-center min-h-0">
				<ChartContainer className="w-full h-[250px]" config={config}>
					<PieChart>
						<Tooltip content={<ChartTooltipContent hideLabel />} />
						<Pie
							data={data}
							cx="50%"
							cy="50%"
							innerRadius={60}
							outerRadius={100}
							paddingAngle={2}
							dataKey="value">
							{data.map((entry, index) => (
								<Cell
									key={entry.name}
									fill={
										entry.fill ??
										DEFAULT_COLORS[index % DEFAULT_COLORS.length] ??
										'var(--color-chart-1)'
									}
								/>
							))}
						</Pie>
					</PieChart>
				</ChartContainer>
			</div>
			{showLegend && (
				<div className="flex flex-wrap justify-center gap-4 pt-4">
					{data.map((entry, index) => (
						<div key={entry.name} className="flex items-center gap-2">
							<div
								className="h-3 w-3 rounded-full"
								style={{
									backgroundColor:
										entry.fill ??
										DEFAULT_COLORS[index % DEFAULT_COLORS.length] ??
										'var(--color-chart-1)',
								}}
							/>
							<span className="text-sm text-muted-foreground">
								{formatLabels ? formatLabel(entry.name) : entry.name} ({entry.value})
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
