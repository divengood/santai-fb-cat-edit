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
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold">Action Log</h2>
        <button
          onClick={onClear}
          className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
        >
          Clear Log
        </button>
      </div>
      <div className="p-4 h-[60vh] overflow-y-auto font-mono text-sm">
        {logs.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 font-sans">No actions logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log, index) => (
              <li key={index} className={`p-2 rounded-md ${levelStyles[log.level].bg}`}>
                <div className="flex items-start">
                  <span className="text-gray-400 dark:text-gray-500 mr-3">
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