import { BarChart3, ClipboardList, Home, LayoutDashboard, User, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import type { UserRole } from '@/features/auth/types';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';

type NavItem = {
	name: string;
	path: string;
	icon: React.ComponentType<{ className?: string }>;
};

type RoleNavConfig = Record<UserRole, NavItem[]>;

const NAV_CONFIG: RoleNavConfig = {
	host: [
		{ name: 'Dashboard', path: '/host/dashboard', icon: LayoutDashboard },
		{ name: 'Cleanings', path: '/host/cleanings', icon: ClipboardList },
		{ name: 'Properties', path: '/host/properties', icon: Home },
		{ name: 'Account', path: '/host/account', icon: User },
	],
	cleaner: [
		{ name: 'Dashboard', path: '/cleaner/dashboard', icon: LayoutDashboard },
		{ name: 'Cleanings', path: '/cleaner/cleanings', icon: ClipboardList },
		{ name: 'Account', path: '/cleaner/account', icon: User },
	],
	admin: [
		{ name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
		{ name: 'Users', path: '/admin/users', icon: Users },
		{ name: 'Cleanings', path: '/admin/cleanings', icon: ClipboardList },
		{ name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
		{ name: 'Account', path: '/admin/account', icon: User },
	],
};

export function Navigation() {
	const { profile } = useAuth();
	const location = useLocation();

	const role = (profile?.role as UserRole) || 'host';
	const navItems = NAV_CONFIG[role];
	return (
		<>
			<nav className="fixed top-0 left-0 right-0 z-50 hidden h-20 border-b bg-background/80 backdrop-blur-md md:block">
				<div className="flex-between h-full max-w-6xl px-6 mx-auto">
					<Logo />
					<div className="flex items-center gap-2">
						{navItems.map((item) => (
							<Link
								key={item.path}
								to={item.path}
								className={cn(
									'flex items-center gap-2 px-5 py-2.5 text-sm font-bold transition-all rounded-lg',
									location.pathname.startsWith(item.path)
										? 'bg-primary text-primary-background shadow-md'
										: 'text-muted-foreground hover:bg-muted',
								)}>
								<item.icon className="size-4" />
								{item.name}
							</Link>
						))}
					</div>
				</div>
			</nav>

			<nav className="fixed bottom-0 left-0 right-0 z-50 h-20 border-t bg-background/80 backdrop-blur-lg md:hidden pb-safe">
				<div
					className="grid h-full px-2 mx-auto place-items-center"
					style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}>
					{navItems.map((item) => (
						<Link
							key={item.path}
							to={item.path}
							className={cn(
								'flex flex-col items-center justify-center gap-1 transition-all w-full h-full',
								location.pathname.startsWith(item.path) ? 'text-primary' : 'text-muted-foreground',
							)}>
							<div
								className={cn(
									'p-2 rounded-lg transition-all',
									location.pathname.startsWith(item.path) && 'bg-primary/10',
								)}>
								<item.icon className="size-6" />
							</div>
						</Link>
					))}
				</div>
			</nav>
		</>
	);
}
