export interface Bubble {
	id: number;
	size: number;
	top: number;
	left: number;
	opacity: string;
}

export interface BubbleConfig {
	rows: number;
	cols: number;
	maxSize: number;
	seedOffset?: number;
}

const seededRandom = (seed: number) => {
	const x = Math.sin(seed) * 10000;
	return x - Math.floor(x);
};

export function generateBubbles(config: BubbleConfig): Bubble[] {
	const { rows, cols, maxSize, seedOffset = 0 } = config;
	const generated: Bubble[] = [];

	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const i = r * cols + c;
			const seedBase = i + seedOffset;

			const sPos = seededRandom(seedBase + 11);
			const sSize = seededRandom(seedBase + 22);
			const sOpacity = seededRandom(seedBase + 33);
			const sJitter = seededRandom(seedBase + 44);

			const baseTop = (r / rows) * 75;
			const baseLeft = (c / cols) * 100;

			const jitterTop = (sPos - 0.5) * 15;
			const jitterLeft = (sJitter - 0.5) * 15;

			const verticalWeight = r / rows + 0.3;
			const sizePower = sSize ** 2;
			const size = Math.floor(sizePower * maxSize * verticalWeight) + 30;

			generated.push({
				id: i,
				size,
				top: Math.min(Math.max(baseTop + jitterTop, 5), 82),
				left: Math.min(Math.max(baseLeft + jitterLeft, 2), 95),
				opacity: (sOpacity * 0.3 + 0.05).toFixed(2),
			});
		}
	}
	return generated;
}
