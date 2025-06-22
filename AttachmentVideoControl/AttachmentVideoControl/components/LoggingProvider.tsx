import * as React from 'react';
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { LogEntry } from './LogsViewer';

interface LoggingContextProps {
  logs: LogEntry[];
  addLog: (level: 'info' | 'error' | 'warn', message: string) => void;
  clearLogs: () => void;
  copyLogs: () => Promise<boolean>;
}

const LoggingContext = createContext<LoggingContextProps | null>(null);

export const useLogging = () => {
  const context = useContext(LoggingContext);
  if (!context) {
    throw new Error('useLogging must be used within a LoggingProvider');
  }
  return context;
};

interface LoggingProviderProps {
  children: React.ReactNode;
  debugMode: boolean;
}

export const LoggingProvider: React.FC<LoggingProviderProps> = ({ children, debugMode }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Format log arguments for display
  const formatLogArgument = useCallback((value: unknown): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (e) {
        return '[Object]';
      }
    }
    return String(value);
  }, []);
  
  // Add a log entry
  const addLog = useCallback((level: 'info' | 'error' | 'warn', message: string) => {
    const timestamp = new Date().toISOString().slice(11, -1); // HH:MM:SS.sss
    setLogs(prevLogs => {
      // Keep max 500 logs to prevent excessive memory usage
      const newLogs = [...prevLogs, { timestamp, level, message }];
      if (newLogs.length > 500) {
        return newLogs.slice(newLogs.length - 500);
      }
      return newLogs;
    });
  }, []);
  
  // Clear all logs
  const clearLogs = useCallback(() => {
    setLogs([]);
    addLog('info', 'Logs cleared');
  }, [addLog]);
  
  // Copy logs to clipboard
  const copyLogs = useCallback(async (): Promise<boolean> => {
    const logText = logs.map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`).join('\n');
    try {
      await navigator.clipboard.writeText(logText);
      addLog('info', 'Logs copied to clipboard');
      return true;
    } catch (err) {
      addLog('error', `Failed to copy logs: ${err}`);
      return false;
    }
  }, [logs, addLog]);
  
  // Override console methods to capture logs
  useEffect(() => {
    if (debugMode) {
      // Store original console methods
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      const originalConsoleWarn = console.warn;
      
      // Override console.log
      console.log = (...args) => {
        addLog('info', args.map(arg => formatLogArgument(arg)).join(' '));
        originalConsoleLog(...args);
      };
      
      // Override console.error
      console.error = (...args) => {
        addLog('error', args.map(arg => formatLogArgument(arg)).join(' '));
        originalConsoleError(...args);
      };
      
      // Override console.warn
      console.warn = (...args) => {
        addLog('warn', args.map(arg => formatLogArgument(arg)).join(' '));
        originalConsoleWarn(...args);
      };
      
      // Log component initialization
      addLog('info', 'Component initialized with debugMode=true');
      
      // Restore original console methods on component unmount
      return () => {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
      };
    }
  }, [debugMode, addLog, formatLogArgument]);
  
  const value = {
    logs,
    addLog,
    clearLogs,
    copyLogs
  };
  
  return (
    <LoggingContext.Provider value={value}>
      {children}
    </LoggingContext.Provider>
  );
};

export default LoggingProvider; 