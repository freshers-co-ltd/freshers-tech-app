import { BarChart3, CheckCircle2, Clock, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';

export function CleanerDashboardPage() {
	return (
		<main className="max-width-container">
			<PageHeader
				title="Overview"
				description="Track your performance and upcoming jobs."
			/>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<StatCard
					label="Assigned Cleanings"
					value="3"
					icon={BarChart3}
				/>
				<StatCard label="Active Cleanings" value="2" icon={Clock} />
				<StatCard label="Completed" value="18" icon={CheckCircle2} />
			</div>
		</main>
	);
}
