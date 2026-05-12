'use client';

import { Banknote, Calendar, Clock, KeyRound, Mail, ShieldBan, ShieldCheck } from 'lucide-react';
import { EntityBadge } from '@/components/EntityBadge';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import type { UserRole } from '@/features/auth/authService';
import { formatDate } from '@/lib/utils';

interface UserCardProps {
	user: {
		full_name: string | null;
		email: string | null;
		role: UserRole;
		avatar_url: string | null;
		banned_until: string | null;
		created_at: string | null;
		last_sign_in_text?: string | null;
		is_online: boolean;
		base_price_per_cleaning?: number | null;
	};
	onResetPassword: () => void;
	onBan?: () => void;
	onUnban?: () => void;
	onEditBasePrice?: () => void;
}

export function UserCard({
	user,
	onResetPassword,
	onBan,
	onUnban,
	onEditBasePrice,
}: UserCardProps) {
	const isBanned = !!user.banned_until;
	const isHost = user.role === 'host';

	return (
		<div className="w-full p-4 space-y-4">
			<div className="flex items-center gap-3">
				<UserAvatar src={user.avatar_url} fallbackName={user.full_name} size="lg" />
				<div>
					<p className="font-bold text-xl">{user.full_name || 'Unknown'}</p>
					<div className="flex gap-2 flex-wrap items-center">
						<EntityBadge variant={{ type: 'role', value: user.role }} />
						<EntityBadge
							variant={{
								type: 'userStatus',
								value: isBanned ? 'banned' : user.is_online ? 'online' : 'offline',
							}}
						/>
					</div>
				</div>
			</div>

			<div className="space-y-1.5 ml-1">
				<p className="text-sm text-muted-foreground flex items-center gap-2">
					<Mail className="size-4 shrink-0" />
					<span className="truncate">{user.email || 'Unknown'}</span>
				</p>
				<p className="text-sm text-muted-foreground flex items-center gap-2">
					<Clock className="size-4 shrink-0" />
					<span>Online {user.last_sign_in_text || 'unknown'}</span>
				</p>
				<p className="text-sm text-muted-foreground flex items-center gap-2">
					<Calendar className="size-4 shrink-0" />
					{user.created_at ? (
						<span>Joined on {formatDate(user.created_at ?? '')}</span>
					) : (
						<span>Join date unknown</span>
					)}
				</p>
				{isHost && (
					<p className="text-sm text-muted-foreground flex items-center gap-2">
						<Banknote className="size-4 shrink-0" />
						<span>Base cleaning price: £{user.base_price_per_cleaning?.toFixed(2) ?? '0.00'}</span>
					</p>
				)}
			</div>

			<div className="flex flex-col md:flex-row gap-2 md:ml-1">
				{isHost && onEditBasePrice && (
					<Button variant="outline" size="sm" onClick={onEditBasePrice}>
						<Banknote className="size-4 mr-1" />
						Edit Price
					</Button>
				)}
				<Button variant="outline" size="sm" onClick={onResetPassword}>
					<KeyRound className="size-4 mr-1" />
					Reset Password
				</Button>
				{isBanned && onUnban ? (
					<Button variant="outline" size="sm" onClick={onUnban}>
						<ShieldCheck className="size-4 mr-1" />
						Unban
					</Button>
				) : (
					!isBanned &&
					onBan && (
						<Button variant="destructive" size="sm" onClick={onBan}>
							<ShieldBan className="size-4 mr-1" />
							Ban User
						</Button>
					)
				)}
			</div>
		</div>
	);
}
