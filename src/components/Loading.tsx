import { Loader2 } from 'lucide-react';
import { DICT } from '@/dictionary';

export const Loading = () => {
	return (
		<div className="flex-col-center min-h-screen gap-4 bg-background">
			<Loader2 className="size-14 animate-spin text-primary" />
			<div className="flex flex-col items-center gap-1">
				<h2 className="text-2xl font-semibold tracking-tight">{DICT.COMMON.LOADING_TITLE}</h2>
				<p className="text-lg text-muted-foreground">{DICT.COMMON.LOADING_MESSAGE}</p>
			</div>
		</div>
	);
};
