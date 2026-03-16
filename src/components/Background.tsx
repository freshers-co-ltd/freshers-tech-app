import { useEffect, useMemo, useState } from 'react';
import { type Bubble, type BubbleConfig, generateBubbles } from '@/components/Bubbles';

interface BubbleBackgroundProps {
	seedOffset?: number;
}

export function BubbleBackground({ seedOffset = 2 }: BubbleBackgroundProps) {
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
			sm: { rows: 4, cols: 3, maxSize: 140, seedOffset },
			md: { rows: 4, cols: 4, maxSize: 220, seedOffset },
			lg: { rows: 4, cols: 6, maxSize: 280, seedOffset },
			xl: { rows: 5, cols: 8, maxSize: 360, seedOffset },
		};

		return generateBubbles(configs[screenTier]);
	}, [screenTier, seedOffset]);

	return (
		<div className="fixed inset-0 z-0 flex flex-col pointer-events-none">
			<div className="relative w-full h-2/3 portrait:h-3/5 bg-background shrink-0 overflow-hidden">
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

			<div className="w-full flex-1 bg-primary bg-linear-to-t from-primary-dark via-primary to-primary-light" />

			<div className="absolute left-0 w-full overflow-hidden rotate-180 -translate-y-full top-2/3 portrait:top-3/5 leading-0">
				<svg
					className="relative block w-[calc(100%+1.3px)] h-20 md:h-37.5 -translate-y-1"
					data-name="Layer 1"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 1200 120"
					preserveAspectRatio="none">
					<title>Decorative wave divider</title>
					<path
						d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
						opacity=".25"
						className="fill-primary-light"
					/>
					<path
						d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z"
						opacity=".5"
						className="fill-primary-light"
					/>
					<path
						d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
						className="fill-primary-light"
					/>
				</svg>
			</div>
		</div>
	);
}
