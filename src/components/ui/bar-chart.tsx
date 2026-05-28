'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';

import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';

export interface TrendData {
	value: number;
	isPositive: boolean;
}

export interface BarChartProps {
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

export function BarChartComponent({
	title,
	subtitle,
	data,
	config,
	valueKey = Object.keys(config)[0] ?? '',
	trend,
	showTrend = true,
	trendLabel,
}: BarChartProps) {
	return (
		<div className="flex flex-col">
			{(title || subtitle) && (
				<div className="mb-4">
					{title && <h3 className="text-lg font-semibold">{title}</h3>}
					{subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
				</div>
			)}
			<div className="flex-1 min-h-0">
				<ChartContainer className="h-full w-full" config={config}>
					<BarChart
						accessibilityLayer
						data={data}
						margin={{
							top: 20,
						}}>
						<CartesianGrid vertical={false} />
						<XAxis
							axisLine={false}
							dataKey="date"
							tickFormatter={(value) => String(value).slice(0, 3)}
							tickLine={false}
							tickMargin={10}
						/>
						<YAxis axisLine={false} tickLine={false} tickMargin={10} width={32} />
						<ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={false} />
						<Bar dataKey={valueKey} radius={8} fill={`var(--color-${valueKey})`}>
							<LabelList fontSize={12} offset={12} position="top" />
						</Bar>
					</BarChart>
				</ChartContainer>
			</div>
			{showTrend && trend && (
				<div className="flex flex-col items-start gap-2 text-sm pt-4 border-t">
					<div className="flex gap-2 leading-none font-medium">
						{trend.isPositive ? 'Trending up by' : 'Trending down by'} {trend.value}% this month{' '}
						{trend.isPositive ? (
							<TrendingUp className="h-4 w-4" />
						) : (
							<TrendingDown className="h-4 w-4" />
						)}
					</div>
					{trendLabel && <div className="text-muted-foreground leading-none">{trendLabel}</div>}
				</div>
			)}
		</div>
	);
}
