import { Download } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DICT } from '@/dictionary';
import { PwaInstallInstructions } from '@/features/auth/components/PwaInstallInstructions';
import { usePwaInstall } from '@/hooks/usePwaInstall';

export function PwaInstallButton() {
	const { isInstalled } = usePwaInstall();
	const [open, setOpen] = useState(false);

	if (isInstalled) {
		return null;
	}

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				onClick={() => setOpen(true)}
				className="mt-6 text-xs text-muted-foreground">
				<Download className="size-3.5" />
				{DICT.PWA.BUTTON_INSTALL}
			</Button>
			<PwaInstallInstructions open={open} onOpenChange={setOpen} />
		</>
	);
}
