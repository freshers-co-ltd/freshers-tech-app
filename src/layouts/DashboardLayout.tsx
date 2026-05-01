import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { ComponentProps } from 'react';
import { CtaCard } from '@/components/CtaCard';
import { NotificationsCard } from '@/components/NotificationsCard';
import { Stat, StatIndicator, StatLabel, StatTrend, StatValue } from '@/components/ui/stat';
import { DICT } from '@/dictionary';
import { useAuth } from '@/features/auth/AuthContext';

interface StatItem {
	label: string;
	value: string | number;
	icon: LucideIcon;
	iconColor?: string;
	trend?: {
		type: 'up' | 'down' | 'neutral';
		label: string;
	};
}

interface CtaConfig {
	title: string;
	message: string;
	buttonText: string;
	icon: LucideIcon;
	onClick: () => void;
}

interface DashboardLayoutProps extends ComponentProps<'main'> {
	stats: StatItem[];
	cta?: CtaConfig;
}

export function DashboardLayout({ stats, cta, className, ...props }: DashboardLayoutProps) {
	const dict = DICT.DASHBOARD;
	const { profile } = useAuth();
	const firstName = profile?.full_name?.split(' ')[0] || profile?.role;

	return (
		<main className={`max-width-container p-2 md:p-8 ${className ?? ''}`.trim()} {...props}>
			<header className="mb-6">
				<div className="space-y-1">
					<h1 className="text-3xl font-bold uppercase">{`${dict.TITLE}, ${firstName}`}</h1>
				</div>
			</header>

			<div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
				{stats.map((stat) => (
					<Stat key={stat.label}>
						<StatIndicator variant="icon" iconColor={stat.iconColor}>
							<stat.icon />
						</StatIndicator>
						<StatValue>{stat.value}</StatValue>
						{stat.trend && (
							<StatTrend trend={stat.trend.type}>
								{stat.trend.type === 'up' && <ArrowUp />}
								{stat.trend.type === 'down' && <ArrowDown />}
								{stat.trend.label}
							</StatTrend>
						)}
						<StatLabel>{stat.label}</StatLabel>
					</Stat>
				))}
			</div>

			<div className={`grid gap-6 md:gap-8 ${cta ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
				<NotificationsCard maxItems={4} />
				{cta && <CtaCard {...cta} />}
			</div>
		</main>
	);
}
