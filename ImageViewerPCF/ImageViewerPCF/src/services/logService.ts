/**
 * LogService - Centralized logging for the ImageViewer PCF control
 * This service provides consistent logging methods that are captured by the LogViewer component
 */

export class LogService {
  private readonly componentName: string;
  
  /**
   * Initialize a new logger for a specific component
   * @param componentName Name of the component using this logger
   */
  constructor(componentName: string) {
    this.componentName = componentName;
  }
  
  /**
   * Log an informational message
   * @param functionName Name of the function where log is called
   * @param message Message to log
   */
  public log(functionName: string, message: string): void {
    console.log(`[${this.componentName}.${functionName}] ${message}`);
  }
  
  /**
   * Log an error message
   * @param functionName Name of the function where error occurred
   * @param message Error message
   * @param error Optional error object
   */
  public error(functionName: string, message: string, error?: unknown): void {
    if (error) {
      console.error(`[${this.componentName}.${functionName}] ${message}`, error);
    } else {
      console.error(`[${this.componentName}.${functionName}] ${message}`);
    }
  }
  
  /**
   * Log a warning message
   * @param functionName Name of the function where warning occurred
   * @param message Warning message
   */
  public warn(functionName: string, message: string): void {
    console.warn(`[${this.componentName}.${functionName}] ${message}`);
  }
  
  /**
   * Create a new logger for a child component/function
   * @param childName Name of the child component
   * @returns A new LogService instance for the child component
   */
  public createChildLogger(childName: string): LogService {
    return new LogService(`${this.componentName}.${childName}`);
  }
} 