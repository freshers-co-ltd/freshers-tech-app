import { BarChart3, CheckCircle2, Clock, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';

export function CleanerDashboardPage() {
	return (
		<main className="max-width-container">
			<PageHeader
				title="Overview"
				description="Track your performance and upcoming jobs."
				actions={
					<Button className="rounded-xl font-bold">
						<Plus className="mr-2 size-4" /> New Job
					</Button>
				}
			/>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<StatCard
					label="Earnings"
					value="$1,240"
					icon={BarChart3}
					trend={{ value: 12, isPositive: true }}
				/>
				<StatCard label="Active Jobs" value="4" icon={Clock} />
				<StatCard label="Completed" value="48" icon={CheckCircle2} />
			</div>
		</main>
	);
}
