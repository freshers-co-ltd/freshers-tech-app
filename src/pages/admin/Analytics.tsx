'use client';

import { format, subMonths } from 'date-fns';
import { Banknote, CalendarX, Clock, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Loading } from '@/components/Loading';
import { StackedAreaChart } from '@/components/ui/area-chart';
import { BarChartComponent } from '@/components/ui/bar-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { LineChartComponent } from '@/components/ui/linear-line-chart';
import { PieChartComponent } from '@/components/ui/pie-chart';
import { Stat, StatIndicator, StatLabel, StatValue } from '@/components/ui/stat';
import { DICT } from '@/dictionary';
import { AuditLogDialog } from '@/features/admin/components/AuditLogDialog';
import { AuditLogEntryComponent } from '@/features/admin/components/AuditLogEntry';
import { analyticsService } from '@/features/admin/services/analyticsService';
import type {
	AuditLogEntry,
	MonthlyStats,
	RevenueMetrics,
	StatusBreakdown,
	UserGrowthByMonth,
} from '@/features/admin/types';
import { formatCurrency, formatHours } from '@/lib/utils';

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

	const dict = DICT.ADMIN.ANALYTICS;

	const barChartConfig = {
		cleanings: {
			label: 'Cleanings',
			color: 'color-mix(in oklch, var(--color-blue), var(--color-blue-border) 75%)',
		},
	};

	const lineChartConfig = {
		gross: {
			label: 'Gross Revenue',
			color: 'color-mix(in oklch, var(--color-yellow), var(--color-yellow-border) 80%)',
		},
		net: {
			label: 'Net Revenue',
			color: 'color-mix(in oklch, var(--color-green), var(--color-green-border) 70%)',
		},
	};

	const areaChartConfig = {
		hosts: {
			label: dict.CHARTS.HOSTS,
			color: 'color-mix(in oklch, var(--color-purple), var(--color-purple-border))',
		},
		cleaners: {
			label: dict.CHARTS.CLEANERS,
			color: 'color-mix(in oklch, var(--color-blue), var(--color-blue-border))',
		},
	};

	const cleaningsData = last6Months.map((month) => {
		const found = monthlyStats.find((m) => m.month === month);
		return { date: month, cleanings: found?.cleanings ?? 0 };
	});

	const revenueData = last6Months.map((month) => {
		const found = monthlyStats.find((m) => m.month === month);
		return { date: month, gross: found?.gross ?? 0, net: found?.net ?? 0 };
	});

	const userGrowthData = last6Months.map((month) => {
		const found = userGrowth.find((g) => g.month === month);
		return { date: month, hosts: found?.hosts ?? 0, cleaners: found?.cleaners ?? 0 };
	});

	const activeCleaningsData = activeCleanings.map((item) => ({
		name: item.status,
		value: item.count,
	}));

	return (
		<main className="max-width-container p-2 md:p-8">
			<header className="mb-6">
				<div className="space-y-1">
					<h1 className="text-3xl font-bold uppercase text-center md:text-left">{dict.TITLE}</h1>
				</div>
			</header>
			{loading ? (
				<Loading />
			) : (
				<>
					<h2 className="text-xl font-semibold mb-2">Month to Date</h2>
					<div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
						<Stat>
							<StatIndicator variant="icon" className="text-warning-light">
								<Sparkles />
							</StatIndicator>
							<StatValue>{revenueMetrics?.completed_count?.toString() ?? '0'}</StatValue>
							<StatLabel>{dict.PLATFORM.COMPLETED_THIS_MONTH}</StatLabel>
						</Stat>

						<Stat>
							<StatIndicator variant="icon" className="text-destructive">
								<CalendarX />
							</StatIndicator>
							<StatValue>{revenueMetrics?.cancelled_count?.toString() ?? '0'}</StatValue>
							<StatLabel>{dict.PLATFORM.CANCELLED_THIS_MONTH}</StatLabel>
						</Stat>

						<Stat>
							<StatIndicator
								variant="icon"
								className="text-[color-mix(in_oklch,var(--color-warning),var(--color-destructive))]">
								<Clock />
							</StatIndicator>
							<StatValue>
								{revenueMetrics?.avg_completion_hours
									? formatHours(revenueMetrics.avg_completion_hours)
									: '0 hours'}
							</StatValue>
							<StatLabel>{dict.PLATFORM.AVG_COMPLETION_TIME}</StatLabel>
						</Stat>

						<Stat>
							<StatIndicator variant="icon" className="text-success">
								<Banknote />
							</StatIndicator>
							<StatValue>
								{revenueMetrics?.revenue_current
									? formatCurrency(revenueMetrics.revenue_current)
									: `${DICT.COMMON.CURRENCY}0`}
							</StatValue>
							<StatLabel>{dict.PLATFORM.TOTAL_EARNINGS}</StatLabel>
						</Stat>
					</div>

					<DatePickerWithRange className="mb-4" value={dateRange} onChange={setDateRange} />

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
						<Card className="flex-1 py-3 md:py-6">
							<CardHeader>
								<CardTitle>{dict.CHARTS.CLEANING_REQUESTS}</CardTitle>
							</CardHeader>
							<CardContent className="flex-1 px-3 md:px-6">
								<BarChartComponent data={cleaningsData} config={barChartConfig} />
							</CardContent>
						</Card>

						<Card className="flex-1 py-3 md:py-6">
							<CardHeader>
								<CardTitle>{dict.CHARTS.REVENUE}</CardTitle>
							</CardHeader>
							<CardContent className="flex-1 px-3 md:px-6">
								<LineChartComponent data={revenueData} config={lineChartConfig} />
							</CardContent>
						</Card>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
						<Card className="flex-1 py-3 md:py-6">
							<CardHeader>
								<CardTitle>{dict.CHARTS.USER_GROWTH}</CardTitle>
							</CardHeader>
							<CardContent className="flex-1 px-3 md:px-6">
								<StackedAreaChart
									data={userGrowthData as unknown as Array<Record<string, string | number>>}
									config={areaChartConfig}
								/>
							</CardContent>
						</Card>

						<Card className="flex-1 py-3 md:py-6">
							<CardHeader>
								<CardTitle>{dict.CHARTS.STATUS_BREAKDOWN}</CardTitle>
							</CardHeader>
							<CardContent className="flex-1 px-3 md:px-6">
								<PieChartComponent data={activeCleaningsData} />
							</CardContent>
						</Card>
					</div>

					<Card className="p-3 sm:p-6">
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-semibold">{dict.AUDIT.TITLE}</h3>
							<Button variant="outline" size="sm" onClick={() => setIsAuditDialogOpen(true)}>
								{dict.AUDIT.VIEW_ALL}
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
			)}
			<AuditLogDialog open={isAuditDialogOpen} onOpenChange={setIsAuditDialogOpen} />
		</main>
	);
}
