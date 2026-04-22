'use client';

import { ArrowLeft, Loader2, Plus, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { DICT } from '@/dictionary';
import { cleaningService } from '@/features/admin/cleaningService';
import { type AdminHostDetail, userService } from '@/features/admin/userService';
import { CleaningStatusBadge } from '@/features/cleanings/components/CleaningStatusBadge';

export function AdminHostDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [host, setHost] = useState<AdminHostDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [selectedProperty, setSelectedProperty] = useState('');
	const [scheduledStart, setScheduledStart] = useState('');
	const [serviceCost, setServiceCost] = useState(50);
	const [instructions, setInstructions] = useState('');
	const [stocksIncluded, setStocksIncluded] = useState(false);
	const [creating, setCreating] = useState(false);

	const fetchHostDetail = useCallback(async () => {
		if (!id) {
			return;
		}
		setLoading(true);
		const result = await userService.getHostDetail(id);
		if (result.error) {
			toast.error(result.error);
			navigate('/admin/users');
		} else {
			setHost(result.data as AdminHostDetail | null);
		}
		setLoading(false);
	}, [id, navigate]);

	useEffect(() => {
		fetchHostDetail();
	}, [fetchHostDetail]);

	const handleCreateCleaning = async () => {
		if (!host || !selectedProperty || !scheduledStart) {
			toast.error('Please fill in all required fields');
			return;
		}
		setCreating(true);
		const result = await cleaningService.createCleaningForHost(
			host.id,
			selectedProperty,
			scheduledStart,
			serviceCost,
			{ instructions, stocksIncluded },
		);
		setCreating(false);
		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success('Cleaning request created');
			setIsCreateModalOpen(false);
			fetchHostDetail();
		}
	};

	const d = DICT.ADMIN.USERS.DETAIL;

	if (loading) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="size-8 animate-spin text-muted-foreground" />
			</div>
		);
	}
	if (!host) {
		return null;
	}

	const properties = host.properties || [];
	const cleanings = host.cleanings || [];
	const stats = host.cleaning_stats;

	return (
		<main className="max-width-container">
			<Button variant="ghost" onClick={() => navigate('/admin/users')} className="mb-4">
				<ArrowLeft className="size-4 mr-2" />
				Back to Users
			</Button>
			<PageHeader title={host.full_name || 'Host Details'} description={host.email || ''} />
			<div className="grid gap-6 md:grid-cols-2">
				<Card className="p-6">
					<h3 className="text-lg font-semibold mb-4">Profile</h3>
					<div className="flex items-center gap-4 mb-4">
						<div className="size-16 rounded-full bg-muted flex items-center justify-center">
							<User className="size-8 text-muted-foreground" />
						</div>
						<div>
							<p className="text-xl font-bold">{host.full_name || 'Unknown'}</p>
							<p className="text-muted-foreground">{host.email}</p>
						</div>
					</div>
					<Separator className="my-4" />
					<div className="space-y-2">
						<p>
							<span className="text-muted-foreground">Status:</span>{' '}
							<span className={host.banned_until ? 'text-warning' : 'text-success'}>
								{host.banned_until ? 'Banned' : 'Online'}
							</span>
						</p>
						<p>
							<span className="text-muted-foreground">Verified:</span>{' '}
							{host.is_verified ? 'Yes' : 'No'}
						</p>
					</div>
				</Card>
				<Card className="p-6">
					<h3 className="text-lg font-semibold mb-4">{d.STATS}</h3>
					<div className="grid grid-cols-2 gap-4">
						<div className="text-center p-4 bg-muted/50 rounded-lg">
							<p className="text-3xl font-bold">{stats?.total || 0}</p>
							<p className="text-sm text-muted-foreground">Total Cleanings</p>
						</div>
						<div className="text-center p-4 bg-muted/50 rounded-lg">
							<p className="text-3xl font-bold text-success">{stats?.completed || 0}</p>
							<p className="text-sm text-muted-foreground">Completed</p>
						</div>
						<div className="text-center p-4 bg-muted/50 rounded-lg">
							<p className="text-3xl font-bold text-warning">{stats?.pending || 0}</p>
							<p className="text-sm text-muted-foreground">Pending</p>
						</div>
						<div className="text-center p-4 bg-muted/50 rounded-lg">
							<p className="text-3xl font-bold text-primary">{stats?.in_progress || 0}</p>
							<p className="text-sm text-muted-foreground">In Progress</p>
						</div>
					</div>
				</Card>
			</div>
			<Card className="p-6 mt-6">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold">{d.PROPERTIES}</h3>
				</div>
				{properties.length === 0 ? (
					<p className="text-muted-foreground">No properties found</p>
				) : (
					<div className="space-y-2">
						{properties.map((property) => (
							<div key={property.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
								<div className="size-12 rounded-md bg-muted flex items-center justify-center shrink-0">
									{property.main_image_url ? (
										<img
											src={property.main_image_url}
											alt={property.address_line_1}
											className="size-full object-cover rounded-md"
										/>
									) : (
										<User className="size-5 text-muted-foreground" />
									)}
								</div>
								<div className="flex-1 min-w-0">
									<p className="font-medium truncate">{property.address_line_1}</p>
									<p className="text-sm text-muted-foreground">
										{property.postcode} {property.town_city}
									</p>
								</div>
								<p className="text-sm text-muted-foreground">
									{property.bedrooms} bed, {property.bathrooms} bath
								</p>
							</div>
						))}
					</div>
				)}
			</Card>
			<Card className="p-6 mt-6">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold">{d.CLEANINGS}</h3>
					<Button
						size="sm"
						onClick={() => setIsCreateModalOpen(true)}
						disabled={properties.length === 0}>
						<Plus className="size-4 mr-2" />
						{d.CREATE_CLEANING}
					</Button>
				</div>
				{cleanings.length === 0 ? (
					<p className="text-muted-foreground">No cleaning requests found</p>
				) : (
					<div className="space-y-2">
						{cleanings.map((cleaning) => (
							<div key={cleaning.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
								<div className="flex-1 min-w-0">
									<p className="font-medium truncate">
										Property: {cleaning.property_id.slice(0, 8)}...
									</p>
									<p className="text-sm text-muted-foreground">
										Scheduled: {new Date(cleaning.scheduled_start).toLocaleDateString()}
									</p>
								</div>
								<CleaningStatusBadge status={cleaning.status} />
								<p className="text-sm font-medium">£{cleaning.service_cost}</p>
							</div>
						))}
					</div>
				)}
			</Card>
			<Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{d.CREATE_CLEANING}</DialogTitle>
						<DialogDescription>Create a new cleaning request for this host</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label>Property</Label>
							<select
								value={selectedProperty}
								onChange={(e) => setSelectedProperty(e.target.value)}
								className="w-full h-10 px-3 rounded-md border bg-background">
								<option value="">Select a property</option>
								{properties.map((p) => (
									<option key={p.id} value={p.id}>
										{p.address_line_1}, {p.postcode}
									</option>
								))}
							</select>
						</div>
						<div>
							<Label>Scheduled Date</Label>
							<Input
								type="datetime-local"
								value={scheduledStart}
								onChange={(e) => setScheduledStart(e.target.value)}
							/>
						</div>
						<div>
							<Label>Service Cost (£)</Label>
							<Input
								type="number"
								value={serviceCost}
								onChange={(e) => setServiceCost(Number(e.target.value))}
								min={0}
							/>
						</div>
						<div>
							<Label>Instructions</Label>
							<Input
								value={instructions}
								onChange={(e) => setInstructions(e.target.value)}
								placeholder="Special instructions..."
							/>
						</div>
						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								checked={stocksIncluded}
								onChange={(e) => setStocksIncluded(e.target.checked)}
								id="stocks"
							/>
							<Label htmlFor="stocks">Stocks included</Label>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
								Cancel
							</Button>
							<Button onClick={handleCreateCleaning} disabled={creating}>
								{creating ? <Loader2 className="size-4 animate-spin" /> : 'Create'}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</main>
	);
}
