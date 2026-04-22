'use client';

import { Bell, Globe, LogOut, Mail, Send, Settings, Shield, User } from 'lucide-react';
import { Loading } from '@/components/Loading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { DICT } from '@/dictionary';
import { AccountAvatar } from '@/features/account/components/AccountAvatar';
import { AccountForm } from '@/features/account/components/AccountForm';
import { useAuth } from '@/features/auth/AuthContext';

export function AccountPage() {
	const { loading, signOut } = useAuth();

	const scrollToSection = (id: string) => {
		const element = document.getElementById(id);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	};

	if (loading) {
		return <Loading />;
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-5xl mx-auto p-6 md:py-20">
				<header className="space-y-1.5 mb-12">
					<h1 className="text-3xl font-bold tracking-tight md:text-4xl">{DICT.ACCOUNT.TITLE}</h1>
					<p className="text-muted-foreground">{DICT.ACCOUNT.MESSAGE}</p>
				</header>

				<div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
					<aside className="lg:sticky md:top-25 flex flex-col gap-8">
						<AccountAvatar />
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
								{DICT.ACCOUNT.SECTIONS.PREFERENCES.TITLE}
							</Button>
							<Button
								variant="ghost"
								className="justify-start font-medium text-muted-foreground"
								onClick={() => scrollToSection('support')}>
								<Send className="mr-2 size-4" />
								{DICT.ACCOUNT.SECTIONS.SUPPORT.TITLE}
							</Button>
						</nav>
					</aside>

					<main className="space-y-20">
						<section id="personal-info" className="space-y-4 mb-8 md:scroll-mt-22">
							<div>
								<h2 className="text-xl font-semibold">{DICT.ACCOUNT.SECTIONS.PERSONAL.TITLE}</h2>
								<p className="text-sm text-muted-foreground">
									{DICT.ACCOUNT.SECTIONS.PERSONAL.DESCRIPTION}
								</p>
							</div>
							<Separator />
							<div className="max-w-2xl">
								<AccountForm type="personal" />
							</div>
						</section>

						<section id="security" className="space-y-4 mb-8 md:scroll-mt-22">
							<div>
								<h2 className="text-xl font-semibold">{DICT.ACCOUNT.SECTIONS.SECURITY.TITLE}</h2>
								<p className="text-sm text-muted-foreground">
									{DICT.ACCOUNT.SECTIONS.SECURITY.DESCRIPTION}
								</p>
							</div>
							<Separator />
							<div className="max-w-2xl">
								<AccountForm type="security" />
							</div>
						</section>

						<section id="settings" className="space-y-4 mb-8 md:scroll-mt-22">
							<div>
								<h2 className="text-xl font-semibold">{DICT.ACCOUNT.PREFERENCES.TITLE}</h2>
								<p className="text-sm text-muted-foreground">
									{DICT.ACCOUNT.PREFERENCES.DESCRIPTION}
								</p>
							</div>
							<Separator />
							<div className="max-w-2xl space-y-4 mb-8 md:scroll-mt-22">
								<div className="flex items-center justify-between rounded-lg border p-4">
									<div className="flex gap-4">
										<Bell className="size-5 text-muted-foreground mt-0.5" />
										<div className="space-y-0.5">
											<p className="text-sm font-medium">
												{DICT.ACCOUNT.PREFERENCES.EMAIL_NOTIFICATIONS}
											</p>
											<p className="text-xs text-muted-foreground">
												{DICT.ACCOUNT.PREFERENCES.EMAIL_NOTIFICATIONS_DESC}
											</p>
										</div>
									</div>
									<Switch defaultChecked />
								</div>
								<div className="flex items-center justify-between rounded-lg border p-4">
									<div className="flex gap-4">
										<Shield className="size-5 text-muted-foreground mt-0.5" />
										<div className="space-y-0.5">
											<p className="text-sm font-medium">
												{DICT.ACCOUNT.PREFERENCES.SECURITY_ALERTS}
											</p>
											<p className="text-xs text-muted-foreground">
												{DICT.ACCOUNT.PREFERENCES.SECURITY_ALERTS_DESC}
											</p>
										</div>
									</div>
									<Switch defaultChecked />
								</div>
							</div>
						</section>

						<section id="support" className="space-y-4 mb-8 md:scroll-mt-22">
							<div>
								<h2 className="text-xl font-semibold">{DICT.ACCOUNT.SUPPORT.TITLE}</h2>
								<p className="text-sm text-muted-foreground">{DICT.ACCOUNT.SUPPORT.DESCRIPTION}</p>
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
