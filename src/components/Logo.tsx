import { cn } from '@/lib/utils';

type LogoProps = {
	className?: string;
};

export function Logo({ className }: LogoProps) {
	return (
		<svg
			viewBox="0 438 1024 148"
			className={cn('w-[220px]', className)}
			style={{
				aspectRatio: '1024/148',
				fillRule: 'evenodd',
				clipRule: 'evenodd',
				strokeLinejoin: 'round',
				strokeMiterlimit: 2,
			}}
			xmlns="http://www.w3.org/2000/svg"
			role="img">
			<title>Freshers Co</title>
			<g transform="matrix(0.706473,0,0,0.706473,-39.1865,214.19022)">
				<text
					x="74px"
					y="500px"
					style={{
						fontFamily: "'SegoeUIBlack', 'Segoe UI', sans-serif",
						fontWeight: 900,
						fontSize: '224.253px',
						fill: '#1a4eda',
					}}>
					F
					<tspan
						x="193.082px 343.809px 465.3px 591.281px 768.944px 890.435px 1041.162px"
						y="500px 500px 500px 500px 500px 500px 500px">
						RESHERS
					</tspan>
				</text>
				<text
					x="1167.143px"
					y="500px"
					style={{
						fontFamily: "'SegoeUIBlack', 'Segoe UI', sans-serif",
						fontWeight: 900,
						fontSize: '224.253px',
						fill: '#fbd452',
					}}>
					C
					<tspan x="1306.154px" y="500px">
						O
					</tspan>
				</text>
			</g>
		</svg>
	);
}
