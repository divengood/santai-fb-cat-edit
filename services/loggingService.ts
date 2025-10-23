
import { LogEntry, LogLevel, ToastType } from '../types';

export class Logger {
  private setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
  private addToast: (message: string, type: ToastType) => void;

  constructor(setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>, addToast: (message: string, type: ToastType) => void) {
    this.setLogs = setLogs;
    this.addToast = addToast;
  }

  private log(message: string, level: LogLevel) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
    };
    this.setLogs(prevLogs => [entry, ...prevLogs]);

    switch (level) {
      case LogLevel.ERROR:
        console.error(`[${level}] ${message}`);
        this.addToast(message, ToastType.ERROR);
        break;
      case LogLevel.WARNING:
        console.warn(`[${level}] ${message}`);
        break;
      case LogLevel.SUCCESS:
         console.log(`[${level}] ${message}`);
         this.addToast(message, ToastType.SUCCESS);
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