import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { 
  Stack, 
  Text, 
  IconButton,
  DefaultButton,
  Panel, 
  PanelType,
  ScrollablePane,
  Sticky,
  StickyPositionType
} from "@fluentui/react";

interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "error" | "warning";
}

export interface LogViewerProps {
  isOpen: boolean;
  onDismiss: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({ isOpen, onDismiss }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  // Hook into console methods to capture logs
  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    // Override console.log
    console.log = (...args: unknown[]) => {
      // Call original function
      originalConsoleLog.apply(console, args);
      
      // Parse and store logs
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // Capture all logs from our components/services
      const shouldCapture = 
        message.includes('[ImageViewerPCF]') || 
        message.includes('[AnnotationService') || 
        message.includes('[ImageService') ||
        message.includes('[ImageViewerWrapper') ||
        message.includes('[LogViewer');
        
      if (shouldCapture) {
        setLogs(prevLogs => [...prevLogs, {
          timestamp: new Date().toLocaleTimeString(),
          message,
          type: 'info'
        }]);
      }
    };

    // Override console.error
    console.error = (...args: unknown[]) => {
      // Call original function
      originalConsoleError.apply(console, args);
      
      // Parse and store logs
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // Capture all logs from our components/services
      const shouldCapture = 
        message.includes('[ImageViewerPCF]') || 
        message.includes('[AnnotationService') || 
        message.includes('[ImageService') ||
        message.includes('[ImageViewerWrapper') ||
        message.includes('[LogViewer');
        
      if (shouldCapture) {
        setLogs(prevLogs => [...prevLogs, {
          timestamp: new Date().toLocaleTimeString(),
          message,
          type: 'error'
        }]);
      }
    };

    // Override console.warn
    console.warn = (...args: unknown[]) => {
      // Call original function
      originalConsoleWarn.apply(console, args);
      
      // Parse and store logs
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // Capture all logs from our components/services
      const shouldCapture = 
        message.includes('[ImageViewerPCF]') || 
        message.includes('[AnnotationService') || 
        message.includes('[ImageService') ||
        message.includes('[ImageViewerWrapper') ||
        message.includes('[LogViewer');
        
      if (shouldCapture) {
        setLogs(prevLogs => [...prevLogs, {
          timestamp: new Date().toLocaleTimeString(),
          message,
          type: 'warning'
        }]);
      }
    };

    // Add a test log so we have something to show immediately
    console.log("[LogViewer] Component initialized and capturing logs");

    // Cleanup
    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);

  // Scroll to bottom when logs change or when panel opens
  useEffect(() => {
    if (isOpen && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const clearLogs = () => {
    setLogs([]);
    console.log("[LogViewer] Logs cleared");
  };

  // Add CSS styles for logs
  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.innerHTML = `
      .log-info {
        color: #0078d4;
      }
      .log-error {
        color: #e81123;
      }
      .log-warning {
        color: #ffb900;
      }
      .log-timestamp {
        color: #666;
        margin-right: 8px;
        font-weight: bold;
      }
      .log-entry {
        font-family: 'Courier New', monospace;
        font-size: 12px;
        padding: 2px 0;
        border-bottom: 1px solid #f0f0f0;
        word-break: break-word;
      }
      .log-container {
        height: 60vh;
        max-height: 60vh;
        overflow-y: auto;
        overflow-x: hidden;
        margin-top: 10px;
        padding: 8px;
        -webkit-overflow-scrolling: touch;
        border: 1px solid #eaeaea;
      }
      /* Mobile-specific styles */
      @media (max-width: 600px) {
        .log-container {
          height: 70vh;
          max-height: 70vh;
        }
        .log-entry {
          font-size: 11px;
        }
      }
    `;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={onDismiss}
      headerText="Image Viewer Logs"
      closeButtonAriaLabel="Close"
      type={PanelType.medium}
      isFooterAtBottom={true}
      onRenderFooterContent={() => (
        <Stack horizontal tokens={{ childrenGap: 10 }}>
          <DefaultButton onClick={clearLogs} iconProps={{ iconName: "Delete" }}>
            Clear logs
          </DefaultButton>
          <DefaultButton 
            onClick={() => {
              if (logContainerRef.current) {
                logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
              }
            }} 
            iconProps={{ iconName: "GoToBottom" }}
          >
            Scroll to bottom
          </DefaultButton>
        </Stack>
      )}
      styles={{
        content: {
          padding: '0 16px'
        }
      }}
    >
      <Stack verticalFill>
        <Stack.Item>
          <Text variant="mediumPlus" styles={{ root: { margin: '16px 0 8px 0' } }}>
            Showing {logs.length} log entries
          </Text>
        </Stack.Item>
        <Stack.Item grow styles={{ root: { position: 'relative', height: '100%' } }}>
          <div className="log-container" ref={logContainerRef}>
            {logs.length === 0 ? (
              <Text>No logs to display</Text>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={`log-entry log-${log.type}`}>
                  <span className="log-timestamp">[{log.timestamp}]</span>
                  {log.message}
                </div>
              ))
            )}
          </div>
        </Stack.Item>
      </Stack>
    </Panel>
  );
}; 