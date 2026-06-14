'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { UserRole } from '@/features/auth/types';
import { DICT } from '@/dictionary';

export interface InviteUserDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onInvite: (email: string, role: UserRole, fullName: string) => Promise<boolean>;
}

export function InviteUserDialog({ open, onOpenChange, onInvite }: InviteUserDialogProps) {
	const [email, setEmail] = useState('');
	const [fullName, setFullName] = useState('');
	const [role, setRole] = useState<UserRole>('host');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async () => {
		if (!email || !fullName) {
			return;
		}
		setLoading(true);
		const success = await onInvite(email, role, fullName);
		setLoading(false);
		if (success) {
			setEmail('');
			setFullName('');
			setRole('host');
			onOpenChange(false);
		}
	};

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) {
			setEmail('');
			setFullName('');
			setRole('host');
		}
		onOpenChange(isOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{DICT.ADMIN.USERS.INVITE_USER.TITLE}</DialogTitle>
					<DialogDescription>{DICT.ADMIN.USERS.INVITE_USER.MESSAGE}</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div>
						<span className="text-sm font-medium block mb-2">{DICT.COMMON.LABELS.EMAIL}</span>
						<Input
							id="invite-email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="email@example.com"
						/>
					</div>
					<div>
						<span className="text-sm font-medium block mb-2">{DICT.COMMON.LABELS.NAME}</span>
						<Input
							id="invite-name"
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							placeholder="John Smith"
						/>
					</div>
					<div>
						<span className="text-sm font-medium block mb-2">Role</span>
						<Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="host">{DICT.COMMON.LABELS.HOST}</SelectItem>
								<SelectItem value="cleaner">{DICT.COMMON.LABELS.CLEANER}</SelectItem>
								<SelectItem value="admin">{DICT.COMMON.LABELS.ADMIN}</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							{DICT.COMMON.ACTIONS.CANCEL}
						</Button>
						<Button onClick={handleSubmit} disabled={loading || !email || !fullName}>
							{loading ? <Loader2 className="size-4 animate-spin" /> : DICT.ADMIN.USERS.INVITE_USER.BUTTON_SUBMIT}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
