'use client';

import { ArrowLeft, Clock, Loader2, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { type AdminCleanerDetail, userService } from '@/features/admin/userService';
import { CleaningStatusBadge } from '@/features/cleanings/components/CleaningStatusBadge';

export function AdminCleanerDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [cleaner, setCleaner] = useState<AdminCleanerDetail | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchCleanerDetail = useCallback(async () => {
		if (!id) {
			return;
		}
		setLoading(true);
		const result = await userService.getCleanerDetail(id);
		if (result.error) {
			toast.error(result.error);
			navigate('/admin/users');
		} else {
			setCleaner(result.data as AdminCleanerDetail | null);
		}
		setLoading(false);
	}, [id, navigate]);

	useEffect(() => {
		fetchCleanerDetail();
	}, [fetchCleanerDetail]);

	if (loading) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="size-8 animate-spin text-muted-foreground" />
			</div>
		);
	}
	if (!cleaner) {
		return null;
	}

	const cleanings = cleaner.assigned_cleanings || [];
	const stats = cleaner.cleaner_stats;

	return (
		<main className="max-width-container">
			<Button variant="ghost" onClick={() => navigate('/admin/users')} className="mb-4">
				<ArrowLeft className="size-4 mr-2" />
				Back to Users
			</Button>
			<PageHeader
				title={cleaner.full_name || 'Cleaner Details'}
				description={cleaner.email || ''}
			/>
			<div className="grid gap-6 md:grid-cols-2">
				<Card className="p-6">
					<h3 className="text-lg font-semibold mb-4">Profile</h3>
					<div className="flex items-center gap-4 mb-4">
						<div className="size-16 rounded-full bg-muted flex items-center justify-center">
							<User className="size-8 text-muted-foreground" />
						</div>
						<div>
							<p className="text-xl font-bold">{cleaner.full_name || 'Unknown'}</p>
							<p className="text-muted-foreground">{cleaner.email}</p>
						</div>
					</div>
					<Separator className="my-4" />
					<div className="space-y-2">
						<p>
							<span className="text-muted-foreground">Status:</span>{' '}
							<span className={cleaner.banned_until ? 'text-warning' : 'text-success'}>
								{cleaner.banned_until ? 'Banned' : 'Online'}
							</span>
						</p>
						<p>
							<span className="text-muted-foreground">Verified:</span>{' '}
							{cleaner.is_verified ? 'Yes' : 'No'}
						</p>
					</div>
				</Card>
				<Card className="p-6">
					<h3 className="text-lg font-semibold mb-4">Performance Stats</h3>
					<div className="grid grid-cols-2 gap-4">
						<div className="text-center p-4 bg-muted/50 rounded-lg">
							<p className="text-3xl font-bold">{stats?.total_assigned || 0}</p>
							<p className="text-sm text-muted-foreground">Total Assigned</p>
						</div>
						<div className="text-center p-4 bg-muted/50 rounded-lg">
							<p className="text-3xl font-bold text-success">{stats?.completed || 0}</p>
							<p className="text-sm text-muted-foreground">Completed</p>
						</div>
						<div className="text-center p-4 bg-muted/50 rounded-lg">
							<p className="text-3xl font-bold text-primary">{stats?.in_progress || 0}</p>
							<p className="text-sm text-muted-foreground">In Progress</p>
						</div>
						<div className="text-center p-4 bg-muted/50 rounded-lg">
							<p className="text-3xl font-bold">£{stats?.total_earnings?.toFixed(2) || '0.00'}</p>
							<p className="text-sm text-muted-foreground">Total Earnings</p>
						</div>
					</div>
					{stats?.avg_completion_hours !== null && stats.avg_completion_hours > 0 && (
						<>
							<Separator className="my-4" />
							<div className="flex items-center justify-center gap-2">
								<Clock className="size-4 text-muted-foreground" />
								<span className="text-muted-foreground">
									Average completion time: {stats.avg_completion_hours.toFixed(1)} hours
								</span>
							</div>
						</>
					)}
				</Card>
			</div>
			<Card className="p-6 mt-6">
				<h3 className="text-lg font-semibold mb-4">Assigned Cleanings</h3>
				{cleanings.length === 0 ? (
					<p className="text-muted-foreground">No cleanings assigned</p>
				) : (
					<div className="space-y-2">
						{cleanings.map((cleaning) => (
							<div key={cleaning.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
								<div className="flex-1 min-w-0">
									<p className="font-medium truncate">
										{cleaning.property_address || 'Unknown Property'}
									</p>
									<p className="text-sm text-muted-foreground">
										Scheduled: {new Date(cleaning.scheduled_start).toLocaleDateString()}
									</p>
									<p className="text-sm text-muted-foreground">
										Host: {cleaning.host_name || 'Unknown'}
									</p>
								</div>
								<CleaningStatusBadge status={cleaning.status} />
								<p className="text-sm font-medium">£{cleaning.service_cost}</p>
							</div>
						))}
					</div>
				)}
			</Card>
		</main>
	);
}
