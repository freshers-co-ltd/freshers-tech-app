import { type ComponentType, type JSX, lazy, Suspense } from 'react';
import { Loading } from '@/components/Loading';

export const lazyLoad = <
	TProps extends Record<string, unknown>,
	TModule extends { [K in TName]: ComponentType<TProps> },
	TName extends string & keyof TModule,
>(
	importFn: () => Promise<TModule>,
	name: TName,
): ((props: TProps) => JSX.Element) => {
	const LazyComponent = lazy(async () => {
		const module = await importFn();
		const Component = module[name];
		if (!Component) {
			throw new Error(`Component "${name}" not found in module.`);
		}
		return { default: Component as ComponentType<TProps> };
	});

	return (props: TProps) => (
		<Suspense fallback={<Loading />}>
			<LazyComponent {...(props as TProps)} />
		</Suspense>
	);
};
