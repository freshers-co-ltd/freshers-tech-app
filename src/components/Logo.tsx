import { cn } from '@/lib/utils';

type LogoProps = {
	className?: string;
};

export function Logo({ className }: LogoProps) {
	return (
		<div className={cn('text-2xl font-black tracking-tight text-primary', className)}>
			FRESHERS<span className="text-amber-300">CO</span>
		</div>
	);
}
