import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { ContentBlock } from '@/lib/privacy-notice';
import { privacyNotice } from '@/lib/privacy-notice';

function renderBlock(block: ContentBlock, index: number) {
	switch (block.kind) {
		case 'paragraph':
			return (
				<p key={index} className="leading-relaxed whitespace-pre-line">
					{block.text}
				</p>
			);
		case 'subheading':
			return (
				<h3 key={index} className="font-semibold text-bas mt-5 mb-1">
					{block.text}
				</h3>
			);
		case 'list':
			return (
				<ul key={index} className="list-disc list-inside space-y-1   leading-relaxed">
					{block.items?.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			);
		default:
			return null;
	}
}

export function PrivacyPage() {
	useEffect(() => {
		window.scrollTo(0, 0);
	}, []);

	return (
		<main className="max-width-container p-4 md:p-8 py-8 md:py-12">
			<div className="max-w-3xl mx-auto space-y-8">
				<header className="space-y-2">
					<h1 className="text-3xl font-bold">{privacyNotice.title}</h1>
					<p className="text-sm text-muted-foreground">Last updated: {privacyNotice.lastUpdated}</p>
				</header>

				<div className="space-y-8">
					{privacyNotice.sections.map((section) => (
						<section key={section.id} className="space-y-0">
							<h2 className="text-xl font-semibold mb-3">
								{section.id}. {section.title}
							</h2>
							<div className="space-y-0">
								{section.blocks.map((block, i) => renderBlock(block, i))}
							</div>
						</section>
					))}
				</div>

				<div className="pt-4">
					<Button variant="outline" asChild>
						<Link to="/">Back to home</Link>
					</Button>
				</div>
			</div>
		</main>
	);
}
