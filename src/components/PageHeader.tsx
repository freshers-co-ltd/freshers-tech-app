import type { ReactNode } from 'react';

interface PageHeaderProps {
	title: string;
	description?: string;
	actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
	return (
		<header className="flex flex-col gap-4 mb-8 md:flex-row md:items-end md:justify-between">
			<div className="space-y-1">
				<h1 className="text-3xl font-black tracking-tight text-foreground uppercase">{title}</h1>
				{description && <p className="text-muted-foreground font-medium">{description}</p>}
			</div>
			{actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
		</header>
	);
}
