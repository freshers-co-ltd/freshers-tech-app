'use client';

import { BarChart3, CheckCircle2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/features/notifications/useNotifications';

export function CleanerDashboardPage() {
	return (
		<main className="max-width-container">
			<PageHeader title="Overview" description="Track your performance and upcoming jobs." />

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<StatCard label="Assigned Cleanings" value="3" icon={BarChart3} />
				<StatCard label="Active Cleanings" value="2" icon={Clock} />
				<StatCard label="Completed" value="18" icon={CheckCircle2} />
			</div>

			<div className="mt-8">
				<Card className="p-5 md:p-8">
					<div className="flex items-center justify-between">
						<h2 className="text-lg md:text-xl font-bold uppercase">Recent Activity</h2>
						<Button variant="link" className="px-0 font-bold h-auto" asChild>
							<Link to="/cleaner/notifications">View All</Link>
						</Button>
					</div>
					<CleanerActivityList />
				</Card>
			</div>
		</main>
	);
}

function CleanerActivityList() {
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
