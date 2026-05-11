'use client';

export type LogType =
	| 'push'
	| 'notification'
	| 'realtime'
	| 'subscription'
	| 'visibility'
	| 'error';

export interface LogEntry {
	id: string;
	timestamp: number;
	type: LogType;
	message: string;
	data?: unknown;
}

type Listener = () => void;

const MAX_LOGS = 100;

class DebugLogStore {
	private logs: LogEntry[] = [];

	private listeners: Set<Listener> = new Set();

	addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): void {
		const newEntry: LogEntry = {
			...entry,
			id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
			timestamp: Date.now(),
		};

		this.logs.unshift(newEntry);

		if (this.logs.length > MAX_LOGS) {
			this.logs = this.logs.slice(0, MAX_LOGS);
		}

		console.debug(`[Debug] ${entry.type.toUpperCase()}: ${entry.message}`, entry.data);
		this.notifyListeners();
	}

	getLogs(): LogEntry[] {
		return this.logs;
	}

	clearLogs(): void {
		this.logs = [];
		this.notifyListeners();
	}

	subscribe(listener: Listener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	private notifyListeners(): void {
		for (const listener of this.listeners) {
			listener();
		}
	}
}

export const debugLog = new DebugLogStore();
