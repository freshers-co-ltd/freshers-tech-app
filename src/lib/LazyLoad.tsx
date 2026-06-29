import { type ComponentType, lazy, type ReactElement, Suspense } from 'react';
import { Loading } from '@/components/Loading';

export const lazyLoad = <
	TModule extends Record<string, ComponentType<Record<string, unknown>>>,
	TName extends string & keyof TModule,
>(
	importFn: () => Promise<TModule>,
	name: TName,
): ReactElement => {
	const LazyComponent = lazy(async () => {
		const module = await importFn();
		const Component = module[name];
		if (!Component) {
			throw new Error(`Component "${name}" not found in module.`);
		}
		return { default: Component as ComponentType<Record<string, unknown>> };
	});

	return (
		<Suspense fallback={<Loading />}>
			<LazyComponent />
		</Suspense>
	);
};
