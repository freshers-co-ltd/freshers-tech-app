'use client';

import {
	AlertTriangle,
	ClipboardCheck,
	Clock,
	Home,
	Loader2,
	TrendingUp,
	Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
	analyticsService,
	type OperationalHealth,
	type VolumeMetrics,
} from '@/features/admin/analyticsService';
import { type AdminCleaning, cleaningService } from '@/features/admin/cleaningService';
import { useAuth } from '@/features/auth/AuthContext';

export function AdminDashboardPage() {
	const { profile } = useAuth();
	const [volume, setVolume] = useState<VolumeMetrics | null>(null);
	const [health, setHealth] = useState<OperationalHealth | null>(null);
	const [recentCleanings, setRecentCleanings] = useState<AdminCleaning[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			const [volumeResult, healthResult, cleaningsResult] = await Promise.all([
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
			if (!cleaningsResult.error) {
				setRecentCleanings(cleaningsResult.data || []);
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
	const formattedDate = today.toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

	const stats = [
		{
			label: 'Active Properties',
			value: volume?.active_properties?.toString() || '0',
			icon: Home,
			trend: '+12%',
			trendUp: true,
		},
		{
			label: 'Active Hosts',
			value: volume?.active_hosts?.toString() || '0',
			icon: Users,
			trend: '+8%',
			trendUp: true,
		},
		{
			label: 'Completed This Month',
			value: volume?.completed_mtd?.toString() || '0',
			icon: ClipboardCheck,
			trend: '+24%',
			trendUp: true,
		},
		{
			label: 'In Progress',
			value: health?.in_progress?.toString() || '0',
			icon: Clock,
		},
	];

	if (loading) {
		return (
			<main className="max-width-container">
				<div className="flex items-center justify-center p-12">
					<Loader2 className="size-8 animate-spin text-muted-foreground" />
				</div>
			</main>
		);
	}

	return (
		<main className="max-width-container">
			<div className="mb-8">
				<h1 className="text-2xl font-semibold">
					{greeting}, {profile?.full_name || 'Admin'}
				</h1>
				<p className="text-muted-foreground">{formattedDate}</p>
			</div>

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

			<Card className="border-none shadow-sm">
				<CardContent className="p-0">
					<div className="flex items-center justify-between p-5 border-b">
						<h3 className="font-semibold">Recent Cleanings</h3>
						<Link to="/admin/cleanings">
							<Button variant="ghost" size="sm">
								View All
							</Button>
						</Link>
					</div>

					{recentCleanings.length === 0 ? (
						<p className="text-muted-foreground py-8 text-center">No recent cleanings</p>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead>
									<tr className="border-b bg-muted/30">
										<th className="text-left p-4 text-sm font-medium text-muted-foreground">
											Property
										</th>
										<th className="text-left p-4 text-sm font-medium text-muted-foreground">
											Host
										</th>
										<th className="text-left p-4 text-sm font-medium text-muted-foreground">
											Cleaner
										</th>
										<th className="text-left p-4 text-sm font-medium text-muted-foreground">
											Date
										</th>
										<th className="text-left p-4 text-sm font-medium text-muted-foreground">
											Status
										</th>
										<th className="text-right p-4 text-sm font-medium text-muted-foreground">
											Amount
										</th>
									</tr>
								</thead>
								<tbody>
									{recentCleanings.map((cleaning) => (
										<tr key={cleaning.id} className="border-b last:border-0 hover:bg-muted/30">
											<td className="p-4">
												<p className="font-medium">{cleaning.property_address}</p>
												<p className="text-sm text-muted-foreground">
													{cleaning.property_postcode}
												</p>
											</td>
											<td className="p-4 text-sm">{cleaning.host_name || '-'}</td>
											<td className="p-4 text-sm">{cleaning.cleaner_name || 'Unassigned'}</td>
											<td className="p-4 text-sm">
												{new Date(cleaning.scheduled_start).toLocaleDateString()}
											</td>
											<td className="p-4">
												<StatusBadge value={cleaning.status} />
											</td>
											<td className="p-4 text-right font-medium">£{cleaning.service_cost}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</CardContent>
			</Card>

			{(health?.broken_items_mtd ?? 0) > 0 && (
				<Card className="mt-6 border-amber-200 bg-amber-50">
					<CardContent className="p-4">
						<div className="flex items-center gap-3 text-amber-700">
							<AlertTriangle className="size-5" />
							<h3 className="font-semibold">Attention Required</h3>
						</div>
						<p className="text-sm text-amber-600 mt-1">
							{health?.broken_items_mtd} cleaning
							{health?.broken_items_mtd === 1 ? ' has' : 's have'} reported broken items this month.
						</p>
					</CardContent>
				</Card>
			)}
		</main>
	);
}
