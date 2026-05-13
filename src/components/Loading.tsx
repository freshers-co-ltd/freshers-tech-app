import { Loader2 } from 'lucide-react';
import { DICT } from '@/dictionary';

export const Loading = () => {
	return (
		<div className="flex-col-center gap-4 w-full min-h-[50vh]">
			<Loader2 className="size-14 animate-spin text-primary" />
			<div className="flex flex-col items-center gap-1">
				<h2 className="text-2xl font-semibold tracking-tight">{DICT.COMMON.LOADING.TITLE}</h2>
				<p className="text-lg text-muted-foreground">{DICT.COMMON.LOADING.MESSAGE}</p>
			</div>
		</div>
	);
};
