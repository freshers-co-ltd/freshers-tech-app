import { useEffect, useMemo, useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { type Bubble, type BubbleConfig, generateBubbles } from '@/components/Bubbles';

export function LoginPage() {
	const [screenTier, setScreenTier] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
	useEffect(() => {
		const handleResize = () => {
			const width = window.innerWidth;
			if (width < 640) {
				setScreenTier('sm');
			} else if (width < 1024) {
				setScreenTier('md');
			} else if (width < 1536) {
				setScreenTier('lg');
			} else {
				setScreenTier('xl');
			}
		};

		handleResize();
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	const bubbles = useMemo<Bubble[]>(() => {
		const configs: Record<'sm' | 'md' | 'lg' | 'xl', BubbleConfig> = {
			sm: { rows: 4, cols: 3, maxSize: 140, seedOffset: 1 },
			md: { rows: 4, cols: 4, maxSize: 220, seedOffset: 1 },
			lg: { rows: 4, cols: 6, maxSize: 280, seedOffset: 1 },
			xl: { rows: 5, cols: 8, maxSize: 360, seedOffset: 1 },
		};

		return generateBubbles(configs[screenTier]);
	}, [screenTier]);

	return (
		<div className="relative grid w-full min-h-dvh lg:grid-cols-2 bg-background overflow-hidden">
			<div className="absolute inset-0 z-0 pointer-events-none">
				{bubbles.map((bubble) => (
					<div
						key={bubble.id}
						className="absolute rounded-full bg-primary"
						style={{
							width: `${bubble.size}px`,
							height: `${bubble.size}px`,
							top: `${bubble.top}%`,
							left: `${bubble.left}%`,
							opacity: bubble.opacity,
						}}
					/>
				))}
			</div>

			<div className="relative z-1 flex flex-col items-center justify-center p-4 md:p-8">
				<img
					src="images/logo.png"
					alt="Logo"
					className="w-full max-w-104 relative right-2.5 object-contain mb-5 shrink-0"
				/>

				<div className="w-full max-w-sm lg:max-w-xs shrink-0 p-8 rounded-2xl bg-background/40 backdrop-blur-md border border-white/20 shadow-xl">
					<LoginForm />
				</div>
			</div>

			<div className="relative z-1 hidden h-full bg-muted lg:block">
				<img
					src="images/cleaners.jpg"
					alt="Cleaners ready to work"
					className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
				/>
			</div>
		</div>
	);
}
