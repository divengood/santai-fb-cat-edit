import { LogEntry, LogLevel } from '../types';

export class Logger {
  private setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;

  constructor(setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>) {
    this.setLogs = setLogs;
  }

  private log(message: string, level: LogLevel) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
    };

    // Add the new log to the top of the array
    this.setLogs(prevLogs => [entry, ...prevLogs]);

    switch (level) {
      case LogLevel.ERROR:
        console.error(`[${level}] ${message}`);
        break;
      case LogLevel.WARNING:
        console.warn(`[${level}] ${message}`);
        break;
      default:
        console.log(`[${level}] ${message}`);
    }
  }

  info(message: string) {
    this.log(message, LogLevel.INFO);
  }

  success(message: string) {
    this.log(message, LogLevel.SUCCESS);
  }

  error(message: string, error?: any) {
    let fullMessage = message;
    if (error) {
      if (error instanceof Error) {
        fullMessage += `: ${error.message}`;
      } else if (typeof error === 'string') {
        fullMessage += `: ${error}`;
      }
    }
    this.log(fullMessage, LogLevel.ERROR);
  }
  
  warn(message: string) {
    this.log(message, LogLevel.WARNING);
  }
}