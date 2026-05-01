'use client';

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';

export interface StackedAreaChartProps {
	title?: string;
	subtitle?: string;
	data: Array<Record<string, string | number>>;
	config: ChartConfig;
	className?: string;
}

export function StackedAreaChart({
	title,
	subtitle,
	data,
	config,
	className,
}: StackedAreaChartProps) {
	return (
		<div className={cn('flex flex-col', className)}>
			{(title || subtitle) && (
				<div className="mb-4">
					{title && <h3 className="text-lg font-semibold">{title}</h3>}
					{subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
				</div>
			)}
			<div className="flex-1 min-h-0">
				<ChartContainer className="h-full w-full" config={config}>
					<AreaChart
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
						<YAxis axisLine={false} tickLine={false} tickMargin={8} width={32} />
						<ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={false} />
						{Object.entries(config).map(([key]) => (
							<Area
								key={key}
								dataKey={key}
								fill={`var(--color-${key})`}
								fillOpacity={0.4}
								stackId="a"
								stroke={`var(--color-${key})`}
								type="natural"
							/>
						))}
						<ChartLegend
							content={(props) => (
								<ChartLegendContent payload={props.payload} verticalAlign={props.verticalAlign} />
							)}
						/>
					</AreaChart>
				</ChartContainer>
			</div>
		</div>
	);
}
