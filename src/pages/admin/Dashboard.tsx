'use client';

import { ClipboardCheck, Clock, Home, Loader2, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DICT } from '@/dictionary';
import {
	analyticsService,
	type OperationalHealth,
	type VolumeMetrics,
} from '@/features/admin/analyticsService';
import { cleaningService } from '@/features/admin/cleaningService';
import { useAuth } from '@/features/auth/AuthContext';
import { useNotifications } from '@/features/notifications/useNotifications';

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

			<Card className="p-5 md:p-8">
				<div className="flex items-center justify-between">
					<h2 className="text-lg md:text-xl font-bold uppercase">Recent Activity</h2>
					<Button variant="link" className="px-0 font-bold h-auto" asChild>
						<Link to="/admin/notifications">View All</Link>
					</Button>
				</div>
				<AdminActivityList />
			</Card>
		</main>
	);
}

function AdminActivityList() {
	const { notifications, isLoading, markAsRead } = useNotifications();

	if (isLoading) {
		return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
	}

	if (notifications.length === 0) {
		return <div className="py-8 text-center text-muted-foreground">No recent activity</div>;
	}

	return (
		<div className="flex flex-col">
			{notifications.slice(0, 5).map((notification, index, array) => (
				<div key={notification.id}>
					<div className="flex items-start md:items-center gap-3 md:gap-4 py-4 overflow-hidden">
						<div className="font-bold rounded-lg flex items-center justify-center text-muted-foreground size-10 md:size-12 bg-muted shrink-0">
							{notification.title[0]}
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-bold truncate leading-snug">
								<span className="text-primary">{notification.title}</span>
							</p>
							<p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
								{notification.message}
							</p>
						</div>
						<Button
							size="sm"
							variant="outline"
							className="shrink-0 text-xs md:text-sm h-8 md:h-9"
							onClick={() => markAsRead(notification.id)}>
							View
						</Button>
					</div>
					{index < array.length - 1 && <Separator />}
				</div>
			))}
		</div>
	);
}
