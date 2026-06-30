import { Download, Menu, Monitor, Share, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DICT } from '@/dictionary';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { cn } from '@/lib/utils';

function StepItem({
	step,
	children,
	icon,
}: {
	step: number;
	children: string;
	icon?: React.ReactNode;
}) {
	return (
		<div className="flex items-start gap-3">
			<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
				{step}
			</span>
			<div className="flex items-center gap-2 pt-0.5">
				{icon && <span className="size-4 shrink-0 text-muted-foreground">{icon}</span>}
				<p className="text-sm text-foreground">{children}</p>
			</div>
		</div>
	);
}

function IosContent() {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-3">
				<div className="flex size-10 items-center justify-center rounded-full bg-muted">
					<Smartphone className="size-5 text-muted-foreground" />
				</div>
				<div>
					<h3 className="text-sm font-medium">{DICT.PWA.IOS.TITLE}</h3>
				</div>
			</div>
			<div className="flex flex-col gap-3 pl-1">
				<StepItem step={1} icon={<Share className="size-4" />}>
					{DICT.PWA.IOS.STEP_1}
				</StepItem>
				<StepItem step={2}>{DICT.PWA.IOS.STEP_2}</StepItem>
				<StepItem step={3}>{DICT.PWA.IOS.STEP_3}</StepItem>
			</div>
		</div>
	);
}

function AndroidContent({ canInstall, onInstall }: { canInstall: boolean; onInstall: () => void }) {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-3">
				<div className="flex size-10 items-center justify-center rounded-full bg-muted">
					<Smartphone className="size-5 text-muted-foreground" />
				</div>
				<div>
					<h3 className="text-sm font-medium">{DICT.PWA.ANDROID.TITLE}</h3>
				</div>
			</div>
			{canInstall && (
				<Button onClick={onInstall} className="w-full">
					<Download className="size-4" />
					{DICT.PWA.ANDROID.BUTTON_INSTALL_NATIVE}
				</Button>
			)}
			<div className="flex flex-col gap-3 pl-1">
				<StepItem step={1} icon={<Menu className="size-4" />}>
					{DICT.PWA.ANDROID.STEP_1}
				</StepItem>
				<StepItem step={2}>{DICT.PWA.ANDROID.STEP_2}</StepItem>
				<StepItem step={3}>{DICT.PWA.ANDROID.STEP_3}</StepItem>
			</div>
		</div>
	);
}

function DesktopContent({ canInstall, onInstall }: { canInstall: boolean; onInstall: () => void }) {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-3">
				<div className="flex size-10 items-center justify-center rounded-full bg-muted">
					<Monitor className="size-5 text-muted-foreground" />
				</div>
				<div>
					<h3 className="text-sm font-medium">{DICT.PWA.DESKTOP.TITLE}</h3>
				</div>
			</div>
			{canInstall && (
				<Button onClick={onInstall} className="w-full">
					<Download className="size-4" />
					{DICT.PWA.DESKTOP.BUTTON_INSTALL_NATIVE}
				</Button>
			)}
			<div className="flex flex-col gap-3 pl-1">
				<StepItem step={1}>{DICT.PWA.DESKTOP.STEP_1}</StepItem>
				<StepItem step={2}>{DICT.PWA.DESKTOP.STEP_2}</StepItem>
			</div>
		</div>
	);
}

function FallbackContent() {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-3">
				<div className="flex size-10 items-center justify-center rounded-full bg-muted">
					<Smartphone className="size-5 text-muted-foreground" />
				</div>
				<div>
					<h3 className="text-sm font-medium">{DICT.PWA.FALLBACK.TITLE}</h3>
				</div>
			</div>
			<p className="text-sm text-muted-foreground">{DICT.PWA.FALLBACK.MESSAGE}</p>
		</div>
	);
}

function InstructionBody() {
	const { platform, canInstall, install } = usePwaInstall();

	switch (platform) {
		case 'ios-safari':
			return <IosContent />;
		case 'android-chrome':
			return <AndroidContent canInstall={canInstall} onInstall={install} />;
		case 'desktop-chrome':
		case 'desktop-other':
			return <DesktopContent canInstall={canInstall} onInstall={install} />;
		case 'installed':
			return null;
		default:
			return <FallbackContent />;
	}
}

export function PwaInstallInstructions({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const isDesktop = useMediaQuery('(min-width: 768px)');

	if (!open) {
		return null;
	}

	if (isDesktop) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>{DICT.PWA.TITLE}</DialogTitle>
						<DialogDescription>{DICT.PWA.DESCRIPTION}</DialogDescription>
					</DialogHeader>
					<ScrollArea className="max-h-[60vh]">
						<div className={cn('flex flex-col gap-6 px-1')}>
							<InstructionBody />
						</div>
					</ScrollArea>
					<DialogFooter showCloseButton />
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>{DICT.PWA.TITLE}</DrawerTitle>
					<DrawerDescription>{DICT.PWA.DESCRIPTION}</DrawerDescription>
				</DrawerHeader>
				<ScrollArea className="max-h-[50vh]">
					<div className={cn('flex flex-col gap-6 px-4 pb-4')}>
						<InstructionBody />
					</div>
				</ScrollArea>
				<DrawerFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{DICT.COMMON.ACTIONS.CLOSE}
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
