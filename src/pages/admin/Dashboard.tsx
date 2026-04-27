'use client';

import { ClipboardCheck, Clock, Home, Loader2, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { DICT } from '@/dictionary';
import {
	analyticsService,
	type OperationalHealth,
	type VolumeMetrics,
} from '@/features/admin/analyticsService';
import { cleaningService } from '@/features/admin/cleaningService';
import { useAuth } from '@/features/auth/AuthContext';
import { DropdownDemo } from './test';

export function AdminDashboardPage() {
	const d = DICT.ADMIN.DASHBOARD;
	const { profile } = useAuth();
	const [volume, setVolume] = useState<VolumeMetrics | null>(null);
	const [health, setHealth] = useState<OperationalHealth | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			const [volumeResult, healthResult] = await Promise.all([
				analyticsService.getVolumeMetrics(),
				analyticsService.getOperationalHealth(),
				cleaningService.getAllCleanings({}, 1, 7),
			]);

			if (!volumeResult.error) {
				setVolume(volumeResult.data ?? null);
			}
			if (!healthResult.error) {
				setHealth(healthResult.data ?? null);
			}

			setLoading(false);
		};
		fetchData();
	}, []);

	const today = new Date();
	const greeting =
		today.getHours() < 12
			? 'Good morning'
			: today.getHours() < 18
				? 'Good afternoon'
				: 'Good evening';

	const stats = [
		{
			label: d.STATS.ACTIVE_PROPERTIES,
			value: volume?.active_properties?.toString() || '0',
			icon: Home,
			trend: '+12%',
			trendUp: true,
		},
		{
			label: d.STATS.ACTIVE_HOSTS,
			value: volume?.active_hosts?.toString() || '0',
			icon: Users,
			trend: '+8%',
			trendUp: true,
		},
		{
			label: d.STATS.COMPLETED_THIS_MONTH,
			value: volume?.completed_mtd?.toString() || '0',
			icon: ClipboardCheck,
			trend: '+24%',
			trendUp: true,
		},
		{
			label: d.STATS.IN_PROGRESS,
			value: health?.in_progress?.toString() || '0',
			icon: Clock,
		},
	];

	if (loading) {
		return (
			<div className="max-width-container">
				<div className="flex items-center justify-center p-12">
					<Loader2 className="size-8 animate-spin text-muted-foreground" />
				</div>
			</div>
		);
	}

	return (
		<main className="max-width-container">
			<PageHeader
				title={`${greeting}, ${profile?.full_name || d.WELCOME}`}
				description={d.MESSAGE}
			/>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				{stats.map((stat) => (
					<Card key={stat.label} className="border-none shadow-sm">
						<CardContent className="p-5">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">{stat.label}</span>
								<div className="p-2 rounded-lg bg-muted">
									<stat.icon className="size-4 text-muted-foreground" />
								</div>
							</div>
							<div className="mt-3 flex items-end justify-between">
								<span className="text-2xl font-semibold">{stat.value}</span>
								{stat.trend && (
									<span
										className={`text-xs flex items-center ${stat.trendUp ? 'text-green-600' : 'text-muted-foreground'}`}>
										{stat.trendUp && <TrendingUp className="size-3 mr-1" />}
										{stat.trend}
									</span>
								)}
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<DropdownDemo />
		</main>
	);
}
