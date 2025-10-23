
import React from 'react';
import { LogEntry, LogLevel } from '../types';

interface LogViewerProps {
  logs: LogEntry[];
  onClear: () => void;
}

const levelStyles: { [key in LogLevel]: { text: string; bg: string } } = {
  [LogLevel.INFO]: { text: 'text-sky-800 dark:text-sky-300', bg: 'bg-sky-100 dark:bg-sky-900/50' },
  [LogLevel.SUCCESS]: { text: 'text-green-800 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/50' },
  [LogLevel.ERROR]: { text: 'text-red-800 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/50' },
  [LogLevel.WARNING]: { text: 'text-amber-800 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/50' },
};

export const LogViewer: React.FC<LogViewerProps> = ({ logs, onClear }) => {
  return (
    <div className="bg-white dark:bg-slate-800 shadow rounded-lg">
      <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-semibold">Action Log</h2>
        <button
          onClick={onClear}
          className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-3 py-1 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
        >
          Clear Log
        </button>
      </div>
      <div className="p-4 h-[60vh] overflow-y-auto font-mono text-sm">
        {logs.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 font-sans">No actions logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log, index) => (
              <li key={index} className={`p-2 rounded-md ${levelStyles[log.level].bg}`}>
                <div className="flex items-start">
                  <span className="text-slate-400 dark:text-slate-500 mr-3">
                    {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className={`font-bold w-20 flex-shrink-0 ${levelStyles[log.level].text}`}>
                    [{log.level}]
                  </span>
                  <span className={`flex-1 break-words whitespace-pre-wrap ${levelStyles[log.level].text} font-sans`}>
                    {log.message}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};