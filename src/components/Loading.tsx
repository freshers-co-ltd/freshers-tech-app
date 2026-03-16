import { Loader2 } from 'lucide-react';
import { DICT } from '@/dictionary';

export const Loading = () => {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-background">
			<Loader2 className="w-10 h-10 animate-spin text-primary" />
			<div className="flex flex-col items-center gap-1">
				<h2 className="text-xl font-semibold tracking-tight">{DICT.COMMON.LOADING_REDIRECT}</h2>
				<p className="text-sm text-muted-foreground">{DICT.COMMON.PLEASE_WAIT}</p>
			</div>
		</div>
	);
};
