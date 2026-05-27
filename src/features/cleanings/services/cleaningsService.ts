'use client';

import { cleaningRequestService } from './cleaningRequestService';
import { evidenceService } from './evidenceService';
import { payConfigService } from './payConfigService';
import { reportsService } from './reportsService';
import { tasksService } from './tasksService';

export { cleaningRequestService } from './cleaningRequestService';
export { evidenceService } from './evidenceService';
export { payConfigService } from './payConfigService';
export { reportsService } from './reportsService';
export { tasksService } from './tasksService';

export const cleaningsService = {
	...cleaningRequestService,
	...evidenceService,
	...payConfigService,
	...reportsService,
	...tasksService,
};
