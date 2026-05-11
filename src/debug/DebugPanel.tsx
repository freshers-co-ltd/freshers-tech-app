'use client';

import { useEffect, useState } from 'react';
import { debugLog, type LogEntry, type LogType } from './debugLog';

const LOG_TYPE_COLORS: Record<LogType, { background: string; color: string }> = {
	push: { background: '#3b82f6', color: 'white' },
	notification: { background: '#22c55e', color: 'white' },
	realtime: { background: '#a855f7', color: 'white' },
	subscription: { background: '#f97316', color: 'white' },
	visibility: { background: '#14b8a6', color: 'white' },
	error: { background: '#ef4444', color: 'white' },
};

function formatTime(timestamp: number): string {
	return new Date(timestamp).toLocaleTimeString('en-GB', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
}

export function DebugPanel() {
	const [isExpanded, setIsExpanded] = useState(false);
	const [logs, setLogs] = useState<LogEntry[]>(debugLog.getLogs());
	const [expandedId, setExpandedId] = useState<string | null>(null);

	useEffect(() => {
		return debugLog.subscribe(() => {
			setLogs([...debugLog.getLogs()]);
		});
	}, []);

	return (
		<div
			style={{
				position: 'fixed',
				top: '10px',
				left: '10px',
				right: '10px',
				zIndex: 9999,
				fontFamily: 'monospace',
				fontSize: '12px',
			}}>
			{isExpanded ? (
				<div
					style={{
						width: '100%',
						maxHeight: '80vh',
						backgroundColor: '#1a1a1a',
						borderRadius: '8px',
						boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
						overflow: 'hidden',
						display: 'flex',
						flexDirection: 'column',
					}}>
					<div
						style={{
							padding: '10px 12px',
							backgroundColor: '#2a2a2a',
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							borderBottom: '1px solid #333',
							flexShrink: 0,
						}}>
						<span style={{ color: '#fff', fontWeight: 'bold' }}>Debug Logs ({logs.length})</span>
						<div style={{ display: 'flex', gap: '8px' }}>
							<button
								type="button"
								onClick={() => debugLog.clearLogs()}
								style={{
									padding: '4px 8px',
									fontSize: '11px',
									backgroundColor: '#444',
									color: '#ccc',
									border: 'none',
									borderRadius: '4px',
									cursor: 'pointer',
								}}>
								Clear
							</button>
							<button
								type="button"
								onClick={() => setIsExpanded(false)}
								style={{
									padding: '4px 8px',
									fontSize: '11px',
									backgroundColor: '#555',
									color: '#fff',
									border: 'none',
									borderRadius: '4px',
									cursor: 'pointer',
								}}>
								✕
							</button>
						</div>
					</div>

					<div
						style={{
							flex: 1,
							overflowY: 'auto',
							padding: '8px',
						}}>
						{logs.length === 0 ? (
							<div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>No logs yet</div>
						) : (
							logs.map((log) => (
								<div
									key={log.id}
									style={{
										marginBottom: '6px',
										backgroundColor: '#252525',
										borderRadius: '4px',
										overflow: 'hidden',
									}}>
									<button
										type="button"
										onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
										style={{
											padding: '6px 8px',
											cursor: 'pointer',
											display: 'flex',
											alignItems: 'flex-start',
											gap: '8px',
											background: 'none',
											border: 'none',
											width: '100%',
											textAlign: 'left',
										}}>
										<span style={{ color: '#666', fontSize: '10px', flexShrink: 0 }}>
											{formatTime(log.timestamp)}
										</span>
										<span
											style={{
												padding: '2px 6px',
												borderRadius: '3px',
												fontSize: '10px',
												fontWeight: 'bold',
												backgroundColor: LOG_TYPE_COLORS[log.type].background,
												color: LOG_TYPE_COLORS[log.type].color,
												flexShrink: 0,
											}}>
											{log.type.toUpperCase()}
										</span>
										<span
											style={{
												color: '#ddd',
												flex: 1,
												wordBreak: 'break-word',
												textAlign: 'left',
											}}>
											{log.message}
										</span>
									</button>
									{expandedId === log.id && log.data !== undefined && (
										<pre
											style={{
												margin: 0,
												padding: '8px',
												backgroundColor: '#1a1a1a',
												borderTop: '1px solid #333',
												fontSize: '11px',
												color: '#aaa',
												overflow: 'auto',
												maxHeight: '40vh',
												wordBreak: 'break-all',
											}}>
											{JSON.stringify(log.data, null, 2)}
										</pre>
									)}
								</div>
							))
						)}
					</div>
				</div>
			) : (
				<button
					type="button"
					onClick={() => setIsExpanded(true)}
					style={{
						padding: '8px 12px',
						backgroundColor: '#333',
						color: '#fff',
						border: 'none',
						borderRadius: '20px',
						cursor: 'pointer',
						boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
						fontFamily: 'monospace',
						fontSize: '12px',
					}}>
					Debug {logs.length > 0 && `(${logs.length})`}
				</button>
			)}
		</div>
	);
}
