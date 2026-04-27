'use client';

import { format, subMonths } from 'date-fns';
import { Clock, PoundSterling, ShieldX, SkipForward } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { StackedAreaChart } from '@/components/ui/area-chart';
import { BarChartComponent } from '@/components/ui/bar-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { LineChartComponent } from '@/components/ui/linear-line-chart';
import { PieChartComponent } from '@/components/ui/pie-chart';
import { DICT } from '@/dictionary';
import {
	type AuditLogEntry,
	analyticsService,
	type MonthlyStats,
	type RevenueMetrics,
	type StatusBreakdown,
	type UserGrowthByMonth,
} from '@/features/admin/analyticsService';
import { AuditLogDialog } from '@/features/admin/components/AuditLogDialog';
import { AuditLogEntryComponent } from '@/features/admin/components/AuditLogEntry';

function generateLast6Months(): string[] {
	const months: string[] = [];
	for (let i = 5; i >= 0; i--) {
		const date = subMonths(new Date(), i);
		months.push(format(date, 'MMM yyyy'));
	}
	return months;
}

export function AdminAnalyticsPage() {
	const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
	const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
	const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
	const [userGrowth, setUserGrowth] = useState<UserGrowthByMonth[]>([]);
	const [activeCleanings, setActiveCleanings] = useState<StatusBreakdown[]>([]);
	const [dateRange, setDateRange] = useState<DateRange | undefined>({
		from: subMonths(new Date(), 6),
		to: new Date(),
	});
	const [loading, setLoading] = useState(true);
	const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);

	const last6Months = generateLast6Months();

	const fetchData = useCallback(async () => {
		setLoading(true);

		const [revenueResult, auditResult, monthlyResult, userGrowthResult, activeResult] =
			await Promise.all([
				analyticsService.getRevenueMetrics(),
				analyticsService.getAuditLogs({}, 1, 5),
				analyticsService.getMonthlyStats(),
				analyticsService.getUserGrowthByMonth(),
				analyticsService.getActiveCleanings(),
			]);

		if (!revenueResult.error) {
			setRevenueMetrics(revenueResult.data ?? null);
		}
		if (!auditResult.error) {
			setAuditLogs(auditResult.data || []);
		}
		if (!monthlyResult.error) {
			setMonthlyStats(monthlyResult.data || []);
		}
		if (!userGrowthResult.error) {
			setUserGrowth(userGrowthResult.data || []);
		}
		if (!activeResult.error) {
			setActiveCleanings(activeResult.data || []);
		}

		console.log('DEBUG: raw revenue', revenueResult.data);

		setLoading(false);
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const d = DICT.ADMIN.ANALYTICS;

	const formatCurrency = (value: number): string => {
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: 'GBP',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(value);
	};

	const formatHours = (hours: number): string => {
		if (hours < 1) {
			return `${Math.round(hours * 60)} mins`;
		}
		return `${hours.toFixed(1)} hours`;
	};

	const statCards = [
		{
			label: d.VOLUME.COMPLETED_THIS_MONTH,
			value: revenueMetrics?.completed_count?.toString() ?? '0',
			icon: SkipForward,
			iconColor: 'text-success',
			trend:
				revenueMetrics?.completed_change_pct != null
					? {
							value: Math.abs(revenueMetrics.completed_change_pct),
							isPositive: revenueMetrics.completed_change_pct >= 0,
						}
					: undefined,
		},
		{
			label: d.VOLUME.CANCELLED_THIS_MONTH,
			value: revenueMetrics?.cancelled_count?.toString() ?? '0',
			icon: ShieldX,
			iconColor: 'text-destructive',
		},
		{
			label: d.VOLUME.AVG_COMPLETION_TIME,
			value: revenueMetrics?.avg_completion_hours
				? formatHours(revenueMetrics.avg_completion_hours)
				: '0 hours',
			icon: Clock,
			iconColor: 'text-primary',
		},
		{
			label: d.VOLUME.TOTAL_EARNINGS,
			value: revenueMetrics?.revenue_current
				? formatCurrency(revenueMetrics.revenue_current)
				: `${DICT.FORMAT.CURRENCY}0`,
			icon: PoundSterling,
			iconColor: 'text-success',
			trend:
				revenueMetrics?.revenue_change_pct != null
					? {
							value: Math.abs(revenueMetrics.revenue_change_pct),
							isPositive: revenueMetrics.revenue_change_pct >= 0,
						}
					: undefined,
		},
	];

	const barChartConfig = {
		cleanings: {
			label: 'Cleanings',
			color: 'hsl(var(--primary))',
		},
	};

	const lineChartConfig = {
		revenue: {
			label: 'Revenue',
			color: 'var(--color-chart-2)',
		},
	};

	const areaChartConfig = {
		hosts: {
			label: d.CHARTS.HOSTS,
			color: 'var(--color-chart-3)',
		},
		cleaners: {
			label: d.CHARTS.CLEANERS,
			color: 'var(--color-chart-4)',
		},
	};

	const cleaningsData = last6Months.map((month) => {
		const found = monthlyStats.find((m) => m.month === month);
		return { date: month, cleanings: found?.cleanings ?? 0 };
	});

	const revenueData = last6Months.map((month) => {
		const found = monthlyStats.find((m) => m.month === month);
		console.log(
			'DEBUG revenue: found',
			found,
			'revenue value',
			found?.revenue,
			'type',
			typeof found?.revenue,
		);
		let revenue = 0;
		if (found?.revenue !== undefined && found?.revenue !== null) {
			if (typeof found.revenue === 'number') {
				revenue = found.revenue;
			} else if (typeof found.revenue === 'object') {
				const vals = Object.values(found.revenue);
				const numVal = vals.find((v) => typeof v === 'number');
				if (numVal !== undefined) {
					revenue = numVal as number;
				}
			}
		}
		return { date: month, revenue };
	});

	const userGrowthData = last6Months.map((month) => {
		const found = userGrowth.find((g) => g.month === month);
		return { date: month, hosts: found?.hosts ?? 0, cleaners: found?.cleaners ?? 0 };
	});

	const activeCleaningsData = activeCleanings.map((item) => ({
		name: item.status,
		value: item.count,
	}));

	const renderContent = () => {
		if (loading) {
			return (
				<div className="flex items-center justify-center p-12">
					<div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				</div>
			);
		}

		return (
			<>
				<div className="flex items-center justify-between mb-6">
					<h3 className="text-lg font-semibold">{d.CHARTS.TITLE}</h3>
					<DatePickerWithRange value={dateRange} onChange={setDateRange} />
				</div>

				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
					{statCards.map((stat) => (
						<StatCard key={stat.label} {...stat} />
					))}
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
					<Card>
						<CardHeader>
							<CardTitle>{d.CHARTS.CLEANING_REQUESTS}</CardTitle>
						</CardHeader>
						<CardContent>
							<BarChartComponent data={cleaningsData} config={barChartConfig} />
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>{d.CHARTS.REVENUE}</CardTitle>
						</CardHeader>
						<CardContent>
							<LineChartComponent data={revenueData} config={lineChartConfig} />
						</CardContent>
					</Card>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
					<Card>
						<CardHeader>
							<CardTitle>{d.CHARTS.USER_GROWTH}</CardTitle>
						</CardHeader>
						<CardContent>
							<StackedAreaChart
								data={userGrowthData as unknown as Array<Record<string, string | number>>}
								config={areaChartConfig}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>{d.CHARTS.STATUS_BREAKDOWN}</CardTitle>
						</CardHeader>
						<CardContent>
							<PieChartComponent data={activeCleaningsData} />
						</CardContent>
					</Card>
				</div>

				<Card className="p-6">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold">{d.AUDIT.TITLE}</h3>
						<Button variant="ghost" size="sm" onClick={() => setIsAuditDialogOpen(true)}>
							<span className="sr-only">View all</span>
							{d.AUDIT.VIEW_ALL}
						</Button>
					</div>

					{auditLogs.length === 0 ? (
						<p className="text-muted-foreground py-8 text-center">No activity recorded</p>
					) : (
						<div className="space-y-3">
							{auditLogs.map((log) => (
								<AuditLogEntryComponent key={log.id} log={log} />
							))}
						</div>
					)}
				</Card>
			</>
		);
	};

	return (
		<main className="max-width-container">
			<PageHeader title={d.TITLE} />
			{renderContent()}
			<AuditLogDialog open={isAuditDialogOpen} onOpenChange={setIsAuditDialogOpen} />
		</main>
	);
}
