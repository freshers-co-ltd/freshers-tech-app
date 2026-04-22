'use client';

import {
	AlertTriangle,
	BarChart3,
	Calendar,
	ClipboardCheck,
	Clock,
	Eye,
	Home,
	Loader2,
	Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DICT } from '@/dictionary';
import {
	type AuditLogEntry,
	analyticsService,
	type OperationalHealth,
	type VolumeMetrics,
} from '@/features/admin/analyticsService';

export function AdminAnalyticsPage() {
	const [volumeMetrics, setVolumeMetrics] = useState<VolumeMetrics | null>(null);
	const [operationalHealth, setOperationalHealth] = useState<OperationalHealth | null>(null);
	const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchData = useCallback(async () => {
		setLoading(true);
		const [volumeResult, healthResult, auditResult] = await Promise.all([
			analyticsService.getVolumeMetrics(),
			analyticsService.getOperationalHealth(),
			analyticsService.getAuditLogs({}, 1, 15),
		]);
		if (!volumeResult.error) {
			setVolumeMetrics(volumeResult.data ?? null);
		}
		if (!healthResult.error) {
			setOperationalHealth(healthResult.data ?? null);
		}
		if (!auditResult.error) {
			setAuditLogs(auditResult.data || []);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const d = DICT.ADMIN.ANALYTICS;

	const volumeStats = [
		{
			label: d.VOLUME.PROPERTIES,
			value: volumeMetrics?.active_properties?.toString() || '0',
			icon: Home,
			iconColor: 'text-primary',
		},
		{
			label: 'Active Hosts',
			value: volumeMetrics?.active_hosts?.toString() || '0',
			icon: Users,
			iconColor: 'text-success',
		},
		{
			label: 'Active Cleaners',
			value: volumeMetrics?.active_cleaners?.toString() || '0',
			icon: Users,
			iconColor: 'text-warning',
		},
		{
			label: d.VOLUME.COMPLETED_MTD,
			value: volumeMetrics?.completed_mtd?.toString() || '0',
			icon: ClipboardCheck,
			iconColor: 'text-success',
		},
		{
			label: d.VOLUME.COMPLETED_YTD,
			value: volumeMetrics?.completed_ytd?.toString() || '0',
			icon: Calendar,
			iconColor: 'text-primary',
		},
		{
			label: d.VOLUME.TOTAL_MTD,
			value: volumeMetrics?.total_mtd?.toString() || '0',
			icon: BarChart3,
			iconColor: 'text-warning',
		},
	];

	const healthStats = [
		{
			label: d.HEALTH.AVG_TIME,
			value: operationalHealth?.avg_completion_hours
				? `${operationalHealth.avg_completion_hours.toFixed(1)} ${d.HEALTH.HOURS}`
				: '0 hours',
			icon: Clock,
			iconColor: 'text-primary',
		},
		{
			label: d.HEALTH.BROKEN_ITEMS,
			value: operationalHealth?.broken_items_mtd?.toString() || '0',
			icon: AlertTriangle,
			iconColor: 'text-warning',
		},
		{
			label: 'Low Supplies Reports',
			value: operationalHealth?.low_supplies_mtd?.toString() || '0',
			icon: AlertTriangle,
			iconColor: 'text-destructive',
		},
		{
			label: d.HEALTH.UTILIZATION,
			value: operationalHealth?.cleaner_utilization_pct
				? `${operationalHealth.cleaner_utilization_pct.toFixed(0)}%`
				: '0%',
			icon: Users,
			iconColor: 'text-success',
		},
	];

	if (loading) {
		return (
			<main className="max-width-container">
				<PageHeader title={d.TITLE} />
				<div className="flex items-center justify-center p-12">
					<Loader2 className="size-8 animate-spin text-muted-foreground" />
				</div>
			</main>
		);
	}

	return (
		<main className="max-width-container">
			<PageHeader title={d.TITLE} description={d.TITLE} />

			<Card className="p-6 mb-6">
				<h3 className="text-lg font-semibold mb-4">{d.VOLUME.TITLE}</h3>
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
					{volumeStats.map((stat) => (
						<StatCard key={stat.label} {...stat} />
					))}
				</div>
			</Card>

			<Card className="p-6 mb-6">
				<h3 className="text-lg font-semibold mb-4">{d.HEALTH.TITLE}</h3>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					{healthStats.map((stat) => (
						<StatCard key={stat.label} {...stat} />
					))}
				</div>
			</Card>

			<Card className="p-6">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold">{d.AUDIT.TITLE}</h3>
					<Button variant="ghost" size="sm">
						<Eye className="size-4 mr-2" />
						{d.AUDIT.VIEW_ALL}
					</Button>
				</div>

				{auditLogs.length === 0 ? (
					<p className="text-muted-foreground py-8 text-center">No activity recorded</p>
				) : (
					<div className="space-y-2">
						{auditLogs.map((log) => (
							<div
								key={log.id}
								className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
								<div className="flex-1 min-w-0">
									<p className="font-medium truncate">
										<span className="text-primary">{log.actor_name || 'System'}</span>{' '}
										<span className="font-normal text-muted-foreground">
											{log.action_type.toLowerCase()}
										</span>{' '}
										<span className="text-muted-foreground">{log.target_table}</span>
									</p>
									<p className="text-sm text-muted-foreground">
										{new Date(log.created_at).toLocaleString()}
									</p>
								</div>
							</div>
						))}
					</div>
				)}
			</Card>
		</main>
	);
}
