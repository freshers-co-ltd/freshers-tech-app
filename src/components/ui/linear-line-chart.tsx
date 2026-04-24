'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts';

import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';

export interface TrendData {
	value: number;
	isPositive: boolean;
}

export interface LineChartProps {
	title?: string;
	subtitle?: string;
	data: Array<Record<string, string | number>>;
	config: ChartConfig;
	valueKey?: string;
	trend?: TrendData;
	showTrend?: boolean;
	trendLabel?: string;
	className?: string;
}

export function LineChartComponent({
	title,
	subtitle,
	data,
	config,
	valueKey = Object.keys(config)[0] ?? '',
	trend,
	showTrend = false,
	trendLabel,
	className,
}: LineChartProps) {
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
					<LineChart
						accessibilityLayer
						data={data}
						margin={{
							left: 12,
							right: 12,
						}}>
						<CartesianGrid vertical={false} />
						<XAxis
							axisLine={false}
							dataKey="date"
							tickFormatter={(value) => String(value).slice(0, 3)}
							tickLine={false}
							tickMargin={8}
						/>
						<ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={false} />
						<Line
							dataKey={valueKey}
							dot={false}
							stroke={`var(--color-${valueKey})`}
							strokeWidth={2}
							type="linear"
						/>
					</LineChart>
				</ChartContainer>
			</div>
			{showTrend && trend && (
				<div className="flex flex-col gap-1 text-sm text-center mt-4">
					<div className="flex items-center justify-center gap-2 leading-none font-medium">
						{trend.isPositive ? 'Trending up by' : 'Trending down by'} {trend.value}% this month{' '}
						{trend.isPositive ? (
							<TrendingUp className="h-4 w-4" />
						) : (
							<TrendingDown className="h-4 w-4" />
						)}
					</div>
					{trendLabel && (
						<div className="text-muted-foreground flex items-center justify-center gap-2 leading-none">
							{trendLabel}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
