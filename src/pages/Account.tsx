'use client';

import { Bell, Globe, LogOut, Mail, Send, Settings, Shield, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { DICT } from '@/dictionary';
import { useAuth } from '@/features/auth/AuthContext';
import { authService, type Profile } from '@/features/auth/authService';
import { AccountAvatar, AccountForm } from './AccountForm';

export function AccountPage() {
	const { user, signOut } = useAuth();
	const [profile, setProfile] = useState<Profile | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const loadData = useCallback(async () => {
		if (!user) {
			return;
		}
		const { data } = await authService.getProfile(user.id);
		if (data) {
			setProfile(data);
		}
		setIsLoading(false);
	}, [user]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const handleAvatarUpdate = (url: string) =>
		setProfile((prev) => (prev ? { ...prev, avatar_url: url } : null));

	const scrollToSection = (id: string) => {
		const element = document.getElementById(id);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	};

	if (isLoading) {
		return null;
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-5xl mx-auto p-6 md:py-20">
				<header className="space-y-1.5 mb-12">
					<h1 className="text-3xl font-bold tracking-tight md:text-4xl">{DICT.ACCOUNT.TITLE}</h1>
					<p className="text-muted-foreground">{DICT.ACCOUNT.MESSAGE}</p>
				</header>

				<div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
					<aside className="lg:sticky lg:top-8 flex flex-col gap-8">
						<AccountAvatar
							profile={profile}
							userId={user?.id}
							onUploadSuccess={handleAvatarUpdate}
						/>
						<nav className="flex flex-col gap-1">
							<Button
								variant="ghost"
								className="justify-start font-medium text-muted-foreground"
								onClick={() => scrollToSection('personal-info')}>
								<User className="mr-2 size-4" />
								{DICT.ACCOUNT.SECTIONS.PERSONAL.TITLE}
							</Button>
							<Button
								variant="ghost"
								className="justify-start font-medium text-muted-foreground"
								onClick={() => scrollToSection('security')}>
								<Shield className="mr-2 size-4" />
								{DICT.ACCOUNT.SECTIONS.SECURITY.TITLE}
							</Button>
							<Button
								variant="ghost"
								className="justify-start font-medium text-muted-foreground"
								onClick={() => scrollToSection('settings')}>
								<Settings className="mr-2 size-4" />
								Preferences
							</Button>
							<Button
								variant="ghost"
								className="justify-start font-medium text-muted-foreground"
								onClick={() => scrollToSection('support')}>
								<Send className="mr-2 size-4" />
								Contact
							</Button>
						</nav>
					</aside>

					<main className="space-y-20">
						<section id="personal-info" className="space-y-4 mb-8 scroll-mt-22">
							<div>
								<h2 className="text-xl font-semibold">{DICT.ACCOUNT.SECTIONS.PERSONAL.TITLE}</h2>
								<p className="text-sm text-muted-foreground">
									{DICT.ACCOUNT.SECTIONS.PERSONAL.DESCRIPTION}
								</p>
							</div>
							<Separator />
							<div className="max-w-2xl">
								<AccountForm
									type="personal"
									initialData={profile}
									userId={user?.id}
									onSuccess={loadData}
								/>
							</div>
						</section>

						<section id="security" className="space-y-4 mb-8 scroll-mt-22">
							<div>
								<h2 className="text-xl font-semibold">{DICT.ACCOUNT.SECTIONS.SECURITY.TITLE}</h2>
								<p className="text-sm text-muted-foreground">
									{DICT.ACCOUNT.SECTIONS.SECURITY.DESCRIPTION}
								</p>
							</div>
							<Separator />
							<div className="max-w-2xl">
								<AccountForm type="security" userId={user?.id} />
							</div>
						</section>

						<section id="settings" className="space-y-4 mb-8 scroll-mt-22">
							<div>
								<h2 className="text-xl font-semibold">Preferences</h2>
								<p className="text-sm text-muted-foreground">
									Control how the application behaves and notifies you.
								</p>
							</div>
							<Separator />
							<div className="max-w-2xl space-y-4 mb-8 scroll-mt-22">
								<div className="flex items-center justify-between rounded-lg border p-4">
									<div className="flex gap-4">
										<Bell className="size-5 text-muted-foreground mt-0.5" />
										<div className="space-y-0.5">
											<p className="text-sm font-medium">Email Notifications</p>
											<p className="text-xs text-muted-foreground">
												Receive updates about your account activity.
											</p>
										</div>
									</div>
									<Switch defaultChecked />
								</div>
								<div className="flex items-center justify-between rounded-lg border p-4">
									<div className="flex gap-4">
										<Shield className="size-5 text-muted-foreground mt-0.5" />
										<div className="space-y-0.5">
											<p className="text-sm font-medium">Security Alerts</p>
											<p className="text-xs text-muted-foreground">
												Get notified of new login attempts.
											</p>
										</div>
									</div>
									<Switch defaultChecked />
								</div>
							</div>
						</section>

						<section id="support" className="space-y-4 mb-8 scroll-mt-22">
							<div>
								<h2 className="text-xl font-semibold">Contact</h2>
								<p className="text-sm text-muted-foreground">
									Access help documentation or contact our support team.
								</p>
							</div>
							<Separator />
							<div className="max-w-2xl space-y-8">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<Button
										variant="outline"
										className="h-auto py-4 flex-col items-start gap-2"
										asChild>
										<a href="mailto:Freshersco@outlook.com">
											<div className="flex items-center gap-2 font-semibold">
												<Mail className="size-4" /> Contact Support
											</div>
											<span className="text-xs font-normal text-muted-foreground">
												Get help with any issues
											</span>
										</a>
									</Button>
									<Button
										variant="outline"
										className="h-auto py-4 flex-col items-start gap-2"
										asChild>
										<a href="https://freshersco.com/" target="_blank" rel="noreferrer">
											<div className="flex items-center gap-2 font-semibold">
												<Globe className="size-4" /> Website
											</div>
											<span className="text-xs font-normal text-muted-foreground">
												Get to know FreshersCo better
											</span>
										</a>
									</Button>
								</div>
							</div>
						</section>
						<div className="pt-4 flex flex-col gap-6">
							<Button
								variant="destructive"
								className="w-full sm:w-fit font-medium"
								onClick={() => signOut()}>
								<LogOut className="mr-2 size-4" />
								{DICT.ACCOUNT.LABELS.SIGN_OUT}
							</Button>
						</div>
					</main>
				</div>
			</div>
		</div>
	);
}
