'use client';

import { Calendar, ClipboardList, Home, ShieldCheck, Zap } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormContainer } from '@/components/ui/form-container';
import { Separator } from '@/components/ui/separator';
import { DICT } from '@/dictionary';
import { useAuth } from '@/features/auth/AuthContext';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import {
	CleaningForm,
	type CleaningFormValues,
} from '@/features/cleanings/components/CleaningForm';
import { useProperties } from '@/features/properties/PropertyContext';
import type { Property } from '@/features/properties/propertyService';

export function HostDashboardPage() {
	const { profile } = useAuth();
	const { createCleaning } = useCleanings();
	const { properties } = useProperties();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

	const firstName = profile?.full_name?.split(' ')[0] || 'Host';
	const d = DICT.HOST_DASHBOARD;

	const stats = [
		{ label: d.STATS_CARDS.PROPERTIES, value: '4', icon: Home, iconColor: 'text-primary' },
		{
			label: d.STATS_CARDS.OPEN_REQUESTS,
			value: '5',
			icon: ClipboardList,
			iconColor: 'text-warning',
		},
		{
			label: d.STATS_CARDS.ACTIVE_CLEANERS,
			value: '12',
			icon: ShieldCheck,
			iconColor: 'text-success',
		},
		{ label: d.STATS_CARDS.UPCOMING, value: '2', icon: Calendar, iconColor: 'text-destructive' },
	];

	return (
		<main className="max-width-container">
			<PageHeader title={`${d.TITLE_WELCOME}, ${firstName}`} description={d.MESSAGE} />

			<div className="grid grid-cols-2 gap-4 mb-12 md:grid-cols-4 md:gap-8">
				{stats.map((stat) => (
					<StatCard key={stat.label} {...stat} />
				))}
			</div>

			<div className="grid gap-6 md:gap-8 md:grid-cols-2">
				<Card className="p-5 md:p-8">
					<div className="flex items-center justify-between">
						<h2 className="text-lg md:text-xl font-bold uppercase">{d.ACTIVITY_CARD.TITLE}</h2>
						<Button variant="link" className="px-0 font-bold h-auto">
							{d.ACTIVITY_CARD.VIEW_ALL}
						</Button>
					</div>
					<div className="flex flex-col">
						{[
							{ cleaner: 'Maria S.', property: 'Apartment 4B', time: '10 mins ago' },
							{ cleaner: 'John D.', property: 'Ocean View Villa', time: '1 hour ago' },
							{ cleaner: 'Elena R.', property: 'Apartment 4B', time: '3 hours ago' },
						].map((activity, index, array) => (
							<div key={activity.cleaner + activity.property}>
								<div className="flex items-start md:items-center gap-3 md:gap-4 py-4 overflow-hidden">
									<div className="font-bold rounded-lg flex items-center justify-center text-muted-foreground size-10 md:size-12 bg-muted shrink-0">
										{activity.cleaner[0]}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-bold truncate leading-snug">
											<span className="text-primary">{activity.cleaner}</span>
											<span className="font-medium text-muted-foreground/80">
												{' '}
												{d.ACTIVITY_CARD.APPLIED}{' '}
											</span>
											<span className="block md:inline truncate">{activity.property}</span>
										</p>
										<p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
									</div>
									<Button
										size="sm"
										variant="outline"
										className="shrink-0 text-xs md:text-sm h-8 md:h-9">
										{d.ACTIVITY_CARD.REVIEW_BUTTON}
									</Button>
								</div>
								{index < array.length - 1 && <Separator />}
							</div>
						))}
					</div>
				</Card>

				<Card className="p-5 md:p-8 flex flex-col md:justify-between bg-primary text-primary-foreground">
					<div className="space-y-4 md:space-y-6">
						<div className="rounded-lg flex items-center justify-center bg-primary-foreground/20 size-12 md:size-14">
							<Zap className="fill-primary-foreground size-5 md:size-6" />
						</div>
						<div className="space-y-2">
							<h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">
								{d.CTA_CARD.TITLE}
							</h2>
							<p className="text-base md:text-xl md:pt-4 font-medium leading-relaxed text-primary-foreground/80">
								{d.CTA_CARD.MESSAGE}
							</p>
						</div>
					</div>
					<Button
						variant="secondary"
						size="lg"
						onClick={() => setIsCreateModalOpen(true)}
						className="mt-6 md:mt-8 w-full font-bold uppercase shadow-lg">
						{d.CTA_CARD.BUTTON}
					</Button>
				</Card>
			</div>

			<Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
				<DialogContent className="p-0 overflow-hidden sm:max-w-lg border-none">
					<FormContainer variant="dialog">
						<CleaningForm
							onSubmit={async (data: CleaningFormValues) => {
								const property = properties.find((p: Property) => p.id === data.property_id);
								const cost = property ? 50 + property.bedrooms * 20 + property.bathrooms * 10 : 0;

								const success = await createCleaning({
									property_id: data.property_id,
									scheduled_start: data.scheduled_start.toISOString(),
									custom_tasks: data.custom_tasks.map((t) => t.description),
									service_cost: cost,
								});

								if (success) {
									setIsCreateModalOpen(false);
								}
							}}
							onCancel={() => setIsCreateModalOpen(false)}
						/>
					</FormContainer>
				</DialogContent>
			</Dialog>
		</main>
	);
}
