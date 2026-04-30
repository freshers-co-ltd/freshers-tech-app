'use client';

import { useContext } from 'react';
import { NotificationContext, type NotificationContextType } from './NotificationContext';

export function useNotifications(): NotificationContextType {
	const context = useContext(NotificationContext);
	if (!context) {
		throw new Error('useNotifications must be used within a NotificationProvider');
	}
	return context;
}

export type { NotificationContextType };
