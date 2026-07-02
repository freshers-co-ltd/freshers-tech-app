import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CtaCard } from '@/components/CtaCard';
import { NotificationsCard } from '@/components/NotificationsCard';
import { Stat, StatIndicator, StatLabel, StatTrend, StatValue } from '@/components/ui/stat';
import { DICT } from '@/dictionary';
import { useAuth } from '@/features/auth/AuthContext';
import { PushOnboardingModal } from '@/features/notifications/components/PushOnboardingModal';
import { useNotifications } from '@/features/notifications/useNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';

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
	const { preferences, updatePreferences } = useNotifications();
	const { isSupported, permissionState } = usePushNotifications({
		onValidateFailed: async () => {
			await updatePreferences({ push_enabled: false });
		},
	});
	const firstName = profile?.full_name?.split(' ')[0] || profile?.role;

	const [showOnboarding, setShowOnboarding] = useState(false);
	const closeFromActionRef = useRef(false);

	useEffect(() => {
		if (
			preferences &&
			preferences.push_enabled === null &&
			isSupported &&
			permissionState !== 'denied'
		) {
			setShowOnboarding(true);
		}
	}, [preferences, isSupported, permissionState]);

	const handleOnboardingOpenChange = useCallback(
		async (open: boolean) => {
			if (
				!open &&
				showOnboarding &&
				!closeFromActionRef.current &&
				preferences?.push_enabled !== true
			) {
				try {
					await updatePreferences({ push_enabled: false });
				} catch {
					// Best-effort persistence on dismiss
				}
			}
			closeFromActionRef.current = false;
			setShowOnboarding(open);
		},
		[showOnboarding, updatePreferences, preferences?.push_enabled],
	);

	return (
		<main className={`max-width-container p-2 md:p-8 ${className ?? ''}`.trim()} {...props}>
			<PushOnboardingModal
				isOpen={showOnboarding}
				onOpenChange={handleOnboardingOpenChange}
				onAction={() => {
					closeFromActionRef.current = true;
				}}
			/>
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
