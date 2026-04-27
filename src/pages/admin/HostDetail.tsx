'use client';

import { ArrowLeft, ArrowUp, KeyRound, Loader2, Plus, User } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DICT } from '@/dictionary';
import { cleaningService } from '@/features/admin/cleaningService';
import { type AdminHostDetail, userService } from '@/features/admin/userService';
import { CleaningStatusBadge } from '@/features/cleanings/components/CleaningStatusBadge';
import { AdminLayout } from '@/layouts/AdminLayout';

export function AdminHostDetailPage() {
	const d = DICT.ADMIN.USERS;
	const detail = DICT.ADMIN.USERS.DETAIL;
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

	const handleResetPassword = async () => {
		if (!host) {
			return;
		}
		const result = await userService.resetPassword(host.id);
		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success(d.TOASTS.PASSWORD_RESET_SENT);
		}
	};

	const handleBan = async () => {
		if (!host) {
			return;
		}
		if (!window.confirm(d.TOASTS.BAN_CONFIRM)) {
			return;
		}
		const result = await userService.banUser(host.id);
		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success(d.TOASTS.USER_BANNED);
			fetchHostDetail();
		}
	};

	const handleUnban = async () => {
		if (!host) {
			return;
		}
		if (!window.confirm(d.TOASTS.UNBAN_CONFIRM)) {
			return;
		}
		const result = await userService.unbanUser(host.id);
		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success(d.TOASTS.USER_UNBANNED);
			fetchHostDetail();
		}
	};

	const handleCreateCleaning = async () => {
		if (!host || !selectedProperty || !scheduledStart) {
			toast.error(d.TOASTS.FILL_REQUIRED);
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
			toast.success(d.TOASTS.CLEANING_CREATED);
			setIsCreateModalOpen(false);
			fetchHostDetail();
		}
	};

	if (loading) {
		return (
			<AdminLayout title={detail.TITLE}>
				<div className="max-width-container">
					<div className="flex items-center justify-center p-8">
						<Loader2 className="size-8 animate-spin text-muted-foreground" />
					</div>
				</div>
			</AdminLayout>
		);
	}
	if (!host) {
		return null;
	}

	const properties = host.properties || [];
	const cleanings = host.cleanings || [];
	const stats = host.cleaning_stats;

	return (
		<AdminLayout title={detail.TITLE} stats={[]}>
			<main className="max-width-container">
				<div className="flex items-center justify-between mb-4">
					<Button variant="ghost" onClick={() => navigate('/admin/users')}>
						<ArrowLeft className="size-4 mr-2" />
						Back
					</Button>
					<div className="flex gap-2">
						<Tooltip>
							<TooltipTrigger asChild>
								<span>
									<Button variant="outline" size="sm" onClick={handleResetPassword}>
										<KeyRound className="size-4 mr-2" />
										Reset Password
									</Button>
								</span>
							</TooltipTrigger>
							<TooltipContent>
								<p>Send password reset email</p>
							</TooltipContent>
						</Tooltip>
						{host.banned_until ? (
							<Button variant="outline" size="sm" onClick={handleUnban}>
								<ArrowUp className="size-4 mr-2" />
								Unban
							</Button>
						) : (
							<Button variant="destructive" size="sm" onClick={handleBan}>
								<ArrowUp className="size-4 mr-2" />
								Ban
							</Button>
						)}
					</div>
				</div>

				<PageHeader title={host.full_name || 'Host Details'} description={host.email || ''} />

				<div className="grid gap-4 md:grid-cols-2 mb-6">
					<Card className="p-4">
						<div className="flex items-center gap-3">
							<div className="size-12 rounded-full bg-muted flex items-center justify-center shrink-0">
								{host.avatar_url ? (
									<img
										src={host.avatar_url}
										alt=""
										className="size-full rounded-full object-cover"
									/>
								) : (
									<User className="size-5 text-muted-foreground" />
								)}
							</div>
							<div className="flex-1 min-w-0">
								<p className="font-semibold truncate">{host.full_name || 'Unknown'}</p>
								<p className="text-sm text-muted-foreground truncate">{host.email}</p>
								<div className="flex items-center gap-2 mt-1">
									<span
										className={`px-2 py-0.5 rounded-full text-xs font-medium ${
											host.banned_until ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
										}`}>
										{host.banned_until ? 'Banned' : 'Active'}
									</span>
									{host.is_verified && (
										<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
											Verified
										</span>
									)}
								</div>
							</div>
						</div>
					</Card>
					<Card className="p-4">
						<div className="grid grid-cols-4 gap-3 text-center">
							<div>
								<p className="text-xl font-bold">{stats?.total || 0}</p>
								<p className="text-xs text-muted-foreground">Total</p>
							</div>
							<div>
								<p className="text-xl font-bold text-green-600">{stats?.completed || 0}</p>
								<p className="text-xs text-muted-foreground">Completed</p>
							</div>
							<div>
								<p className="text-xl font-bold text-orange-500">{stats?.pending || 0}</p>
								<p className="text-xs text-muted-foreground">Pending</p>
							</div>
							<div>
								<p className="text-xl font-bold text-blue-600">{stats?.in_progress || 0}</p>
								<p className="text-xs text-muted-foreground">In Progress</p>
							</div>
						</div>
					</Card>
				</div>

				<Card className="mb-4">
					<div className="flex items-center justify-between p-4 border-b">
						<h3 className="font-semibold">{detail.PROPERTIES}</h3>
						<span className="text-sm text-muted-foreground">
							{properties.length} {properties.length === 1 ? 'property' : 'properties'}
						</span>
					</div>
					{properties.length === 0 ? (
						<p className="p-4 text-sm text-muted-foreground">No properties found</p>
					) : (
						<div className="divide-y">
							{properties.map((property) => (
								<button
									type="button"
									key={property.id}
									className="flex items-center gap-3 p-3 w-full text-left hover:bg-muted/50 cursor-pointer"
									onClick={() => navigate(`/admin/cleanings?property=${property.id}`)}>
									<div className="size-10 rounded-md bg-muted flex items-center justify-center shrink-0">
										{property.main_image_url ? (
											<img
												src={property.main_image_url}
												alt={property.address_line_1}
												className="size-full rounded-md object-cover"
											/>
										) : (
											<User className="size-4 text-muted-foreground" />
										)}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">{property.address_line_1}</p>
										<p className="text-xs text-muted-foreground">
											{property.postcode} {property.town_city}
										</p>
									</div>
									<p className="text-xs text-muted-foreground">
										{property.bedrooms}bd / {property.bathrooms}ba
									</p>
								</button>
							))}
						</div>
					)}
				</Card>

				<Card>
					<div className="flex items-center justify-between p-4 border-b">
						<h3 className="font-semibold">{detail.CLEANINGS}</h3>
						<Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
							<Plus className="size-4 mr-1" />
							New
						</Button>
					</div>
					{cleanings.length === 0 ? (
						<p className="p-4 text-sm text-muted-foreground">No cleanings found</p>
					) : (
						<div className="divide-y">
							{cleanings.map((cleaning) => (
								<button
									type="button"
									key={cleaning.id}
									className="flex items-center gap-3 p-3 w-full text-left hover:bg-muted/50 cursor-pointer"
									onClick={() => navigate(`/admin/cleanings?cleaning=${cleaning.id}`)}>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">
											{cleaning.property_id.slice(0, 8)}...
										</p>
										<p className="text-xs text-muted-foreground">
											{new Date(cleaning.scheduled_start).toLocaleDateString()}
										</p>
									</div>
									<CleaningStatusBadge status={cleaning.status} />
									<p className="text-sm font-medium">
										{DICT.FORMAT.CURRENCY}
										{cleaning.service_cost}
									</p>
								</button>
							))}
						</div>
					)}
				</Card>

				<Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{detail.CREATE_CLEANING}</DialogTitle>
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
								<Label>Service Cost ({DICT.FORMAT.CURRENCY_SYMBOL})</Label>
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
		</AdminLayout>
	);
}
