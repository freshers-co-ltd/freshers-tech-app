import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface CtaCardProps {
	title: string;
	message: string;
	buttonText: string;
	icon: LucideIcon;
	onClick: () => void;
}

export function CtaCard({ title, message, buttonText, icon: Icon, onClick }: CtaCardProps) {
	return (
		<Card className="p-4 md:p-6 flex flex-col md:justify-between bg-primary text-primary-foreground">
			<div className="space-y-4 md:space-y-6">
				<div className="rounded-lg flex items-center justify-center bg-primary-foreground/20 size-12 md:size-14">
					<Icon className="fill-primary-foreground size-5 md:size-6" />
				</div>
				<div className="space-y-2">
					<h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">{title}</h2>
					<p className="text-base md:text-xl md:pt-4 font-medium leading-relaxed text-primary-foreground/80">
						{message}
					</p>
				</div>
			</div>
			<Button
				variant="secondary"
				size="lg"
				onClick={onClick}
				className="mt-6 md:mt-8 w-full font-bold uppercase shadow-lg">
				{buttonText}
			</Button>
		</Card>
	);
}
