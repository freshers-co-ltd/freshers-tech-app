export function CleaningGridSkeleton() {
	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center">
				<div className="h-10 w-full md:w-72 bg-muted animate-pulse rounded-md" />
				<div className="h-10 w-40 bg-muted animate-pulse rounded-md" />
				<div className="h-10 w-40 bg-muted animate-pulse rounded-md" />
			</div>
			<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
				{[1, 2, 3].map((i) => (
					<div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
				))}
			</div>
		</div>
	);
}
