'use client';

import { FileText, Globe, LogOut, Mail, Send, Settings, Shield, Trash2, User } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { Loading } from '@/components/Loading';
import { toast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DICT } from '@/dictionary';
import { AccountAvatar } from '@/features/account/components/AccountAvatar';
import { PersonalInfoForm } from '@/features/account/components/PersonalInfoForm';
import { NotificationPreferencesForm } from '@/features/account/components/PreferencesForm';
import { SecurityForm } from '@/features/account/components/SecurityForm';
import { userService } from '@/features/admin/services/userService';
import { useAuth } from '@/features/auth/AuthContext';

export function AccountPage() {
	const { loading, signOut, user, profile } = useAuth();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
						<Link to="/privacy">
							<Button
								variant="ghost"
								className="justify-start font-medium text-muted-foreground w-full">
								<FileText className="mr-1 size-4" />
								{dict.CONTACT.PRIVACY.TITLE}
							</Button>
						</Link>
					</nav>
				</aside>

				<main className="space-y-20">
					<section id="personal-info" className="space-y-4 mb-8 md:scroll-mt-22 scroll-mt-20">
						<div>
							<h2 className="text-xl font-semibold">{dict.PERSONAL.TITLE}</h2>
						</div>
						<Separator />
						<div>
							<PersonalInfoForm />
						</div>
					</section>

					<section id="security" className="space-y-4 mb-8 md:scroll-mt-22 scroll-mt-20">
						<div>
							<h2 className="text-xl font-semibold">{dict.SECURITY.TITLE}</h2>
						</div>
						<Separator />
						<div>
							<SecurityForm />
							{profile?.role === 'admin' && (
								<div className="mt-6 rounded-md border p-4">
									<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
										{DICT.AUTH.MFA.ACCOUNT_STATUS.TITLE}
									</h3>
									<p className="mt-1 text-sm text-muted-foreground">
										{DICT.AUTH.MFA.ACCOUNT_STATUS.ACTIVE}
									</p>
								</div>
							)}
						</div>
					</section>

					<section id="settings" className="space-y-4 mb-8 md:scroll-mt-22 scroll-mt-20">
						<div>
							<h2 className="text-xl font-semibold">{dict.PREFERENCES.TITLE}</h2>
						</div>
						<Separator />
						<div className="mb-8 md:scroll-mt-22 scroll-mt-20">
							<NotificationPreferencesForm />
						</div>
					</section>

					<section id="support" className="space-y-4 mb-8 md:scroll-mt-22 scroll-mt-20">
						<div>
							<h2 className="text-xl font-semibold">{dict.CONTACT.TITLE}</h2>
						</div>
						<Separator />
						<div className="space-y-8">
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
								<Button
									variant="outline"
									className="h-auto py-4 flex-col items-start gap-2"
									asChild>
									<a href="mailto:contact@freshersco.com">
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
								<Button
									variant="outline"
									className="h-auto py-4 flex-col items-start gap-2"
									asChild>
									<Link to="/privacy">
										<div className="flex items-center gap-2 font-semibold">
											<FileText className="size-4" /> {dict.CONTACT.PRIVACY.TITLE}
										</div>
										<span className="text-xs font-normal text-muted-foreground">
											{dict.CONTACT.PRIVACY.SUBTITLE}
										</span>
									</Link>
								</Button>
							</div>
						</div>
					</section>
					<div className="pt-4 flex flex-col gap-4 sm:flex-row sm:justify-between">
						<Button variant="destructive" className="w-full sm:w-fit" onClick={() => signOut()}>
							<LogOut className="mr-1 size-4" />
							{dict.BUTTON_SIGN_OUT}
						</Button>
						<Button
							variant="destructive"
							className="w-full sm:w-fit"
							onClick={() => setDeleteDialogOpen(true)}>
							<Trash2 className="mr-1 size-4" />
							{dict.BUTTON_DELETE_ACCOUNT}
						</Button>
					</div>

					<ConfirmActionDialog
						open={deleteDialogOpen}
						onOpenChange={setDeleteDialogOpen}
						title={dict.DELETE_ACCOUNT.TITLE}
						description={dict.DELETE_ACCOUNT.MESSAGE}
						confirmText={dict.DELETE_ACCOUNT.BUTTON_SUBMIT}
						onConfirm={async () => {
							if (!user) {
								return;
							}
							const { error } = await userService.purgeUserPii(user.id);
							if (error) {
								toast.error(error);
								return;
							}
							toast.success(dict.DELETE_ACCOUNT.TOAST_SUCCESS);
							await signOut();
						}}
						variant="destructive"
					/>
				</main>
			</div>
		</main>
	);
}
