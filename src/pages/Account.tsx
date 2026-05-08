'use client';

import { Globe, LogOut, Mail, Send, Settings, Shield, User } from 'lucide-react';
import { Loading } from '@/components/Loading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DICT } from '@/dictionary';
import { AccountAvatar } from '@/features/account/components/AccountAvatar';
import { PersonalInfoForm } from '@/features/account/components/PersonalInfoForm';
import { NotificationPreferencesForm } from '@/features/account/components/PreferencesForm';
import { SecurityForm } from '@/features/account/components/SecurityForm';
import { useAuth } from '@/features/auth/AuthContext';

export function AccountPage() {
	const { loading, signOut } = useAuth();

	if (loading) {
		return <Loading />;
	}

	const dict = DICT.ACCOUNT;

	return (
		<main className="max-width-container p-2 md:p-8">
			<header className="space-y-1.5 mb-6 md:mb-10">
				<h1 className="text-3xl font-bold uppercase text-center md:text-left">{dict.TITLE}</h1>
			</header>

			<div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
				<aside className="lg:sticky md:top-25 flex flex-col gap-8">
					<AccountAvatar />
					<nav className="flex flex-col gap-1">
						<a href="#personal-info">
							<Button
								variant="ghost"
								className="justify-start font-medium text-muted-foreground w-full">
								<User className="mr-1 size-4" />
								{dict.PERSONAL.TITLE}
							</Button>
						</a>
						<a href="#security">
							<Button
								variant="ghost"
								className="justify-start font-medium text-muted-foreground w-full">
								<Shield className="mr-1 size-4" />
								{dict.SECURITY.TITLE}
							</Button>
						</a>
						<a href="#settings">
							<Button
								variant="ghost"
								className="justify-start font-medium text-muted-foreground w-full">
								<Settings className="mr-1 size-4" />
								{dict.PREFERENCES.TITLE}
							</Button>
						</a>
						<a href="#support">
							<Button
								variant="ghost"
								className="justify-start font-medium text-muted-foreground w-full">
								<Send className="mr-1 size-4" />
								{dict.CONTACT.TITLE}
							</Button>
						</a>
					</nav>
				</aside>

				<main className="space-y-20">
					<section id="personal-info" className="space-y-4 mb-8 md:scroll-mt-22 scroll-mt-20">
						<div>
							<h2 className="text-xl font-semibold">{dict.PERSONAL.TITLE}</h2>
							<p className="text-sm text-muted-foreground">{dict.PERSONAL.SUBTITLE}</p>
						</div>
						<Separator />
						<div className="max-w-2xl">
							<PersonalInfoForm />
						</div>
					</section>

					<section id="security" className="space-y-4 mb-8 md:scroll-mt-22 scroll-mt-20">
						<div>
							<h2 className="text-xl font-semibold">{dict.SECURITY.TITLE}</h2>
							<p className="text-sm text-muted-foreground">{dict.SECURITY.SUBTITLE}</p>
						</div>
						<Separator />
						<div className="max-w-2xl">
							<SecurityForm />
						</div>
					</section>

					<section id="settings" className="space-y-4 mb-8 md:scroll-mt-22 scroll-mt-20">
						<div>
							<h2 className="text-xl font-semibold">{dict.PREFERENCES.TITLE}</h2>
							<p className="text-sm text-muted-foreground">{dict.PREFERENCES.SUBTITLE}</p>
						</div>
						<Separator />
						<div className="max-w-2xl mb-8 md:scroll-mt-22 scroll-mt-20">
							<NotificationPreferencesForm />
						</div>
					</section>

					<section id="support" className="space-y-4 mb-8 md:scroll-mt-22 scroll-mt-20">
						<div>
							<h2 className="text-xl font-semibold">{dict.CONTACT.TITLE}</h2>
							<p className="text-sm text-muted-foreground">{dict.CONTACT.SUBTITLE}</p>
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
											<Mail className="size-4" /> {dict.CONTACT.SUPPORT.TITLE}
										</div>
										<span className="text-xs font-normal text-muted-foreground">
											{dict.CONTACT.SUPPORT.SUBTITLE}
										</span>
									</a>
								</Button>
								<Button
									variant="outline"
									className="h-auto py-4 flex-col items-start gap-2"
									asChild>
									<a href="https://freshersco.com/" target="_blank" rel="noreferrer">
										<div className="flex items-center gap-2 font-semibold">
											<Globe className="size-4" /> {dict.CONTACT.WEBSITE.TITLE}
										</div>
										<span className="text-xs font-normal text-muted-foreground">
											{dict.CONTACT.WEBSITE.SUBTITLE}
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
							<LogOut className="mr-1 size-4" />
							{dict.LABELS.SIGN_OUT}
						</Button>
					</div>
				</main>
			</div>
		</main>
	);
}
