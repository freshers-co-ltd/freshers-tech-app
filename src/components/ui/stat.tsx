import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

function Stat({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="stat"
			className={cn(
				'grid grid-cols-[1fr_auto] gap-x-4 gap-y-0 rounded-lg border bg-card p-3 sm:p-4 text-card-foreground shadow-sm',
				'**:data-[slot=stat-label]:col-span-2 **:data-[slot=stat-value]:col-span-1',
				'**:data-[slot=stat-indicator]:col-start-2 **:data-[slot=stat-indicator]:row-start-1 **:data-[slot=stat-indicator]:self-start',
				'**:data-[slot=stat-description]:col-span-2 **:data-[slot=stat-separator]:col-span-2 **:data-[slot=stat-trend]:col-span-2',
				className,
			)}
			{...props}
		/>
	);
}

function StatLabel({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="stat-label"
			className={cn('font-medium text-muted-foreground text-sm', className)}
			{...props}
		/>
	);
}

const statIndicatorVariants = cva(
	'flex shrink-0 items-center justify-center [&_svg]:pointer-events-none',
	{
		variants: {
			variant: {
				default: "text-muted-foreground [&_svg:not([class*='size-'])]:size-5",
				icon: "size-8 rounded-md border border-current/20 bg-current/10 [&_svg:not([class*='size-'])]:size-3.5",
				badge:
					"h-6 min-w-6 rounded-sm border border-current/20 bg-current/10 px-1.5 font-medium text-xs [&_svg:not([class*='size-'])]:size-3",
				action:
					"size-8 cursor-pointer rounded-md transition-colors hover:bg-muted/50 [&_svg:not([class*='size-'])]:size-4",
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
);

interface StatIndicatorProps
	extends React.ComponentProps<'div'>,
		VariantProps<typeof statIndicatorVariants> {
	iconColor?: string;
}

function StatIndicator({
	className,
	variant = 'default',
	iconColor,
	style,
	...props
}: StatIndicatorProps) {
	const isHex = iconColor?.startsWith('#') || iconColor?.startsWith('rgb');

	return (
		<div
			data-slot="stat-indicator"
			data-variant={variant}
			style={
				{
					color: isHex ? iconColor : undefined,
					...style,
				} as React.CSSProperties
			}
			className={cn(statIndicatorVariants({ variant, className }), !isHex && iconColor)}
			{...props}
		/>
	);
}

function StatValue({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="stat-value"
			className={cn('font-semibold text-2xl tracking-tight truncate', className)}
			{...props}
		/>
	);
}

function StatTrend({
	className,
	trend,
	...props
}: React.ComponentProps<'div'> & { trend?: 'up' | 'down' | 'neutral' }) {
	return (
		<div
			data-slot="stat-trend"
			data-trend={trend}
			className={cn(
				"inline-flex items-center gap-1 font-medium text-xs [&_svg:not([class*='size-'])]:size-3 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				{
					'text-green-600 dark:text-green-400': trend === 'up',
					'text-red-600 dark:text-red-400': trend === 'down',
					'text-muted-foreground': trend === 'neutral' || !trend,
				},
				className,
			)}
			{...props}
		/>
	);
}

function StatSeparator({ ...props }: React.ComponentProps<typeof Separator>) {
	return <Separator data-slot="stat-separator" className="my-2" {...props} />;
}

function StatDescription({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="stat-description"
			className={cn('text-muted-foreground text-xs', className)}
			{...props}
		/>
	);
}

export { Stat, StatDescription, StatIndicator, StatLabel, StatSeparator, StatTrend, StatValue };
