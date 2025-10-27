import React from 'react';

interface HeaderProps {
    onDisconnect: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    isMuted: boolean;
    toggleMute: () => void;
    isCatVisible: boolean;
    toggleCatVisibility: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onDisconnect, theme, toggleTheme, isMuted, toggleMute, isCatVisible, toggleCatVisibility }) => {
  const catIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-6 w-6" fill="currentColor">
      <path d="M256 128C256 92.65 227.3 64 192 64S128 92.65 128 128H112C112 76.65 156.7 32 208 32C259.3 32 304 76.65 304 128H288C288 92.65 259.3 64 224 64S192 92.65 192 128H256zM448 224C448 206.3 433.7 192 416 192H96C78.33 192 64 206.3 64 224C64 229.3 65.14 234.4 67.24 239.1C80.79 269.8 112.5 320 184 320C215.1 320 236.8 306.9 256 288.5C275.2 306.9 296 320 328 320C399.5 320 431.2 269.8 444.8 239.1C446.9 234.4 448 229.3 448 224zM184 256C179.6 256 176 260.4 176 264C176 268.4 179.6 272 184 272C188.4 272 192 268.4 192 264C192 260.4 188.4 256 184 256zM328 256C323.6 256 320 260.4 320 264C320 268.4 323.6 272 328 272C332.4 272 336 268.4 336 264C336 260.4 332.4 256 328 256zM480 352C497.7 352 512 366.3 512 384C512 401.7 497.7 416 480 416H32C14.33 416 0 401.7 0 384C0 366.3 14.33 352 32 352H480z"/>
    </svg>
  );

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <svg className="h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9.75l-9-5.25M12 12.75v9.75" />
            </svg>
            <span className="font-bold text-xl text-gray-800 dark:text-gray-100">Catalog Manager</span>
          </div>
          <div className="flex items-center gap-2">
            <button
                onClick={toggleCatVisibility}
                aria-label={isCatVisible ? 'Hide cat' : 'Show cat'}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 transition-colors"
            >
              {catIcon}
            </button>
            <button
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 transition-colors"
            >
                {isMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l-4-4m0 4l4-4" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                )}
            </button>
            <button
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 transition-colors"
            >
                {theme === 'light' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                )}
            </button>
            <button
              onClick={onDisconnect}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 dark:focus:ring-offset-gray-800 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};