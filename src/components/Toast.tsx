import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { Toaster as SonnerToaster } from 'sonner';

export const Toaster = () => {
	return (
		<SonnerToaster
			position="top-center"
			duration={5000}
			expand={true}
			visibleToasts={6}
			gap={12}
			closeButton
			toastOptions={{
				unstyled: true,
				classNames: {
					toast:
						'group relative flex items-center w-[380px] p-2 rounded-xl border shadow-sm transition-all overflow-hidden',
					content: 'flex flex-col gap-1 ml-3',
					title: 'text-[15px] font-bold leading-none',
					description: 'text-[13px] font-medium leading-snug text-black/80',

					success: 'bg-green-50 border-green-400 text-green-600',
					error: 'bg-red-50 border-red-400 text-red-600',
					info: 'bg-blue-50 border-blue-400 text-blue-600',
					warning: 'bg-yellow-50 border-yellow-400 text-yellow-500',
					loading: 'bg-muted border-muted-foreground text-muted-foreground',

					icon: 'flex items-center justify-center h-7 w-7 flex-shrink-0',
					loader:
						'flex items-center !transform-none justify-center h-7 w-7 !static [&_svg]:h-full [&_svg]:w-full',
					closeButton:
						'!absolute !right-0 !top-1/2 !-translate-y-1/2 !left-auto !flex !items-center !justify-center ' +
						'!w-12 !h-12 !bg-transparent !text-current !border-none !opacity-100 ' +
						'[&_svg]:scale-[1.8] [&_svg]:transition-transform hover:scale-125 hover:stroke-[5px] !transition-all cursor-pointer',
				},
			}}
			icons={{
				success: <CheckCircle2 className="h-7 w-7" />,
				error: <AlertCircle className="h-7 w-7 text-red-600" />,
				info: <Info className="h-7 w-7 text-blue-600" />,
				warning: <AlertTriangle className="h-7 w-7 text-yellow-500" />,
				loading: <Loader2 className="animate-spin" />,
			}}
		/>
	);
};
