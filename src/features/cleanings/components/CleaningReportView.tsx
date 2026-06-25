'use client';

import { AlertCircle, Clock, Package } from 'lucide-react';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { VideoThumbnail } from '@/components/VideoThumbnail';
import { DICT } from '@/dictionary';
import type { CleaningRequest } from '@/features/cleanings/types';

interface CleaningReportViewProps {
	cleaning: CleaningRequest;
	evidenceMedia: { url: string; type: string }[];
	expiryInfo: { daysRemaining: number; isExpired: boolean } | null;
	onMediaClick: (index: number) => void;
}

export function CleaningReportView({
	cleaning,
	evidenceMedia,
	expiryInfo,
	onMediaClick,
}: CleaningReportViewProps) {
	const evidence = Array.isArray(cleaning.evidence) ? cleaning.evidence : [];

	return (
		<div className="grid grid-cols-1 gap-6 pt-2 w-full overflow-hidden">
			{cleaning.report && (
				<div className="grid grid-cols-1 gap-4">
					{cleaning.report.broken_items_report && (
						<div className="space-y-2">
							<h4 className="text-xs font-bold uppercase text-destructive tracking-wider flex items-center gap-2">
								<AlertCircle className="size-4" /> Broken Items
							</h4>
							<div className="p-3 rounded-md border border-destructive/20 bg-destructive/5">
								<p className="text-sm">{cleaning.report.broken_items_report}</p>
							</div>
						</div>
					)}
					{cleaning.report.low_supplies_report && (
						<div className="space-y-2">
							<h4 className="text-xs font-bold uppercase text-warning tracking-wider flex items-center gap-2">
								<Package className="size-4" /> Low Supplies
							</h4>
							<div className="p-3 rounded-md border border-warning-light bg-warning-background">
								<p className="text-sm">{cleaning.report.low_supplies_report}</p>
							</div>
						</div>
					)}
				</div>
			)}

			{evidenceMedia.length > 0 && !expiryInfo?.isExpired && (
				<div className="space-y-3 w-full min-w-0 overflow-hidden">
					<h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
						{DICT.CLEANINGS.DETAIL.EVIDENCE.TITLE}
					</h4>
					<ScrollArea className="w-full pb-2">
						<div className="flex gap-2 p-1 min-w-0">
							{evidence.map((item, index) => (
								<Button
									key={item.id}
									variant="outline"
									className="p-0 size-40 shrink-0 overflow-hidden border rounded-md"
									onClick={() => onMediaClick(index)}>
									{item.type === 'image' ? (
										<ImageWithFallback
											src={evidenceMedia[index]?.url ?? item.media_url}
											className="size-full object-cover"
											alt="Evidence"
										/>
									) : (
										<VideoThumbnail
											src={evidenceMedia[index]?.url ?? item.media_url}
											className="size-full"
										/>
									)}
								</Button>
							))}
						</div>
						<ScrollBar orientation="horizontal" />
					</ScrollArea>
					{expiryInfo && expiryInfo.daysRemaining > 0 && expiryInfo.daysRemaining <= 14 && (
						<div className="flex items-start gap-2 p-2 rounded-md border border-warning-light bg-warning-background text-yellow text-sm">
							<Clock className="size-4 shrink-0 mt-0.5" />
							<span>
								{DICT.CLEANINGS.DETAIL.EVIDENCE.WARNING.replace(
									'{days}',
									String(expiryInfo.daysRemaining),
								)}
							</span>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
