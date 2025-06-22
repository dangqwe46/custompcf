import * as React from 'react';
import { useRef, useEffect } from 'react';

// Log entry interface
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn';
  message: string;
}

interface LogsViewerProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  onCopyLogs: () => void;
  onToggleLogs: () => void;
  showLogs: boolean;
}

const LogsViewer: React.FC<LogsViewerProps> = ({ 
  logs, 
  onClearLogs, 
  onCopyLogs, 
  onToggleLogs,
  showLogs
}) => {
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom when new logs are added
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <>
      {/* Debug controls */}
      <div className="debug-controls">
        <button 
          className="debug-btn toggle-logs-btn" 
          onClick={onToggleLogs}
        >
          {showLogs ? 'Hide Logs' : 'Show Logs'}
        </button>
        
        {showLogs && (
          <>
            <button 
              className="debug-btn clear-logs-btn" 
              onClick={onClearLogs}
            >
              Clear Logs
            </button>
            <button 
              className="debug-btn copy-logs-btn" 
              onClick={onCopyLogs}
            >
              Copy Logs
            </button>
          </>
        )}
      </div>
      
      {/* Logs viewer */}
      {showLogs && (
        <div className="logs-viewer">
          <div className="logs-container">
            {logs.map((log, index) => (
              <div 
                key={`${log.timestamp}-${index}`} 
                className={`log-entry log-${log.level}`}
              >
                <span className="log-timestamp">[{log.timestamp}]</span>
                <span className="log-level">[{log.level.toUpperCase()}]</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}
    </>
  );
};

export default LogsViewer; 