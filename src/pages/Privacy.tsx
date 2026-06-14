import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PLACEHOLDER_WARNING =
	'This is a placeholder privacy notice. Replace this content with your official privacy policy before launch.';

const SECTIONS = [
	{
		title: 'Introduction',
		content:
			'Freshers Co ("we," "our," or "us") is committed to protecting your privacy. This Privacy Notice explains how we collect, use, disclose, and safeguard your information when you use our platform and services.',
	},
	{
		title: 'Information We Collect',
		content:
			'We may collect personal information such as your name, email address, phone number, postal address, and payment details when you create an account, book a cleaning service, or communicate with us. We also collect usage data, including how you interact with our platform, your IP address, browser type, and device information.',
	},
	{
		title: 'How We Use Your Information',
		content:
			'We use the information we collect to provide, maintain, and improve our services; process transactions; send you updates and marketing communications (with your consent); respond to your inquiries; and comply with legal obligations.',
	},
	{
		title: 'Data Sharing',
		content:
			'We may share your information with trusted third-party service providers who assist us in operating our platform, processing payments, or delivering services. We do not sell your personal information to third parties. We may also disclose information if required by law or to protect our rights.',
	},
	{
		title: 'Data Retention',
		content:
			'We retain your personal information for as long as your account is active or as needed to provide you with our services. We will delete or anonymise your data upon account deletion or after a reasonable period of inactivity, subject to legal retention requirements.',
	},
	{
		title: 'Your Rights',
		content:
			'You have the right to access, correct, update, or delete your personal information. You may also object to or restrict certain processing activities. To exercise these rights, please contact us using the information below.',
	},
	{
		title: 'Contact Us',
		content:
			'If you have any questions or concerns about this Privacy Notice or our data practices, please contact us at Freshersco@outlook.com.',
	},
];

export function PrivacyPage() {
	useEffect(() => {
		window.scrollTo(0, 0);
	}, []);

	return (
		<main className="max-width-container p-4 md:p-8 py-8 md:py-12">
			<div className="max-w-3xl mx-auto space-y-8">
				<div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4 text-sm text-amber-800">
					{PLACEHOLDER_WARNING}
				</div>

				<header className="space-y-2">
					<h1 className="text-3xl font-bold">Privacy Notice</h1>
					<p className="text-sm text-muted-foreground">Last updated: June 2026</p>
				</header>

				<div className="space-y-8">
					{SECTIONS.map((section) => (
						<section key={section.title} className="space-y-2">
							<h2 className="text-xl font-semibold">{section.title}</h2>
							<p className="text-muted-foreground leading-relaxed">{section.content}</p>
						</section>
					))}
				</div>

				<div className="pt-4">
					<Button variant="outline" asChild>
						<Link to="/">Back to home</Link>
					</Button>
				</div>
			</div>
		</main>
	);
}
