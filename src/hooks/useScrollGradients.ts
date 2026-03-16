import { useCallback, useEffect, useRef } from 'react';

export function useScrollGradients() {
	const scrollAreaRef = useRef<HTMLDivElement>(null);

	const handleScroll = useCallback((viewport: HTMLElement) => {
		const { scrollTop, scrollHeight, clientHeight } = viewport;
		const showTop = scrollTop > 5;
		const showBottom = scrollHeight - scrollTop - clientHeight > 5;

		const topStop = showTop ? 'transparent 0%, black 40px' : 'black 0%';
		const bottomStop = showBottom ? 'black calc(100% - 40px), transparent 100%' : 'black 100%';

		const mask = `linear-gradient(to bottom, ${topStop}, ${bottomStop})`;

		viewport.style.maskImage = mask;
	}, []);

	useEffect(() => {
		const scrollArea = scrollAreaRef.current;
		if (!scrollArea) {
			return;
		}

		const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
		if (!viewport) {
			return;
		}

		const onScroll = () => handleScroll(viewport);
		handleScroll(viewport);

		const resizeObserver = new ResizeObserver(onScroll);
		resizeObserver.observe(viewport);

		const content = viewport.firstElementChild;
		if (content) {
			resizeObserver.observe(content);
		}

		viewport.addEventListener('scroll', onScroll);
		return () => {
			resizeObserver.disconnect();
			viewport.removeEventListener('scroll', onScroll);
		};
	}, [handleScroll]);

	return { scrollAreaRef };
}
