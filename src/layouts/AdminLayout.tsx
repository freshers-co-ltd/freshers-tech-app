'use client';

import type { ReactNode } from 'react';
import type { AdminStatsCardProps } from '@/components/AdminStatsCard';
import { AdminStatsCard } from '@/components/AdminStatsCard';
import { PageHeader } from '@/components/PageHeader';

interface AdminLayoutProps {
	title: string;
	description?: string;
	stats?: AdminStatsCardProps[];
	children: ReactNode;
}

export function AdminLayout({ title, description, stats, children }: AdminLayoutProps) {
	return (
		<main className="max-width-container">
			<PageHeader title={title} description={description} />

			{stats && stats.length > 0 && (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
					{stats.map((stat) => (
						<AdminStatsCard key={stat.label} {...stat} />
					))}
				</div>
			)}

			{children}
		</main>
	);
}
