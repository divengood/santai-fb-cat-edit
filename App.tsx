import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { ProductManager } from './components/ProductManager';
import { SetManager } from './components/SetManager';
import { AuthScreen } from './components/AuthScreen';
import { LogEntry } from './types';
import { Logger } from './services/loggingService';
import { LogViewer } from './components/LogViewer';
import { WanderingCat } from './components/WanderingCat';

// Make FB object available from the script loaded in index.html
declare const FB: any;

enum View {
  PRODUCTS,
  SETS,
  LOGS,
}

export interface AuthCredentials {
    token: string;
    appId: string;
    catalogId: string;
    cloudinaryCloudName: string;
    cloudinaryUploadPreset: string;
}

const CREDENTIALS_KEY = 'fb_catalog_credentials';

const App: React.FC = () => {
  const [credentials, setCredentials] = useState<AuthCredentials | null>(() => {
    try {
        const stored = localStorage.getItem(CREDENTIALS_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (e) {
        console.error("Failed to parse stored credentials", e);
        return null;
    }
  });
  const [view, setView] = useState<View>(View.PRODUCTS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('theme')) {
        return localStorage.getItem('theme') as 'light' | 'dark';
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('soundMuted') === 'true';
    }
    return false;
  });
   const [isCatVisible, setIsCatVisible] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('catVisible') === 'true';
    }
    return false;
  });
  
  const logger = useMemo(() => new Logger(setLogs), [setLogs]);

  useEffect(() => {
    if (credentials) {
        localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
    } else {
        localStorage.removeItem(CREDENTIALS_KEY);
    }
  }, [credentials]);

  useEffect(() => {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('soundMuted', String(isMuted));
    }
  }, [isMuted]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('catVisible', String(isCatVisible));
    }
  }, [isCatVisible]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };
  
  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };
  
  const toggleCatVisibility = () => {
    setIsCatVisible(prev => !prev);
  };

  const playSound = (soundUrl: string) => {
    if (!isMuted) {
      const audio = new Audio(soundUrl);
      audio.play().catch(e => console.error("Error playing sound:", e));
    }
  };

  useEffect(() => {
    if (credentials?.appId && typeof FB !== 'undefined' && FB.init) {
        try {
            FB.init({
                appId: credentials.appId,
                cookie: true,
                xfbml: true,
                version: 'v19.0'
            });
        } catch (e) {
            console.error("Failed to initialize Facebook SDK on app load:", e);
        }
    }
  }, [credentials?.appId]);

  const handleConnect = (creds: AuthCredentials) => {
    if (creds.token && creds.appId && creds.catalogId && creds.cloudinaryCloudName && creds.cloudinaryUploadPreset) {
      setCredentials(creds);
      logger.success("Successfully connected and authenticated.");
    }
  };
  
  const handleDisconnect = () => {
    logger.info("Disconnect requested. Attempting to log out from Facebook...");
    if (typeof FB !== 'undefined' && FB.getLoginStatus) {
      FB.getLoginStatus((response: any) => {
        if (response.status === 'connected') {
          FB.logout(() => {
            setCredentials(null);
            logger.success("Successfully disconnected from Facebook.");
          });
        } else {
          setCredentials(null);
          logger.warn("Disconnected without active Facebook session (e.g., session expired).");
        }
      });
    } else {
      setCredentials(null);
      logger.success("Successfully disconnected (fallback, FB SDK not available).");
    }
  };

  if (!credentials) {
    return <AuthScreen onConnect={handleConnect} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-200 font-sans">
      <Header 
        onDisconnect={handleDisconnect} 
        theme={theme} 
        toggleTheme={toggleTheme} 
        isMuted={isMuted} 
        toggleMute={toggleMute}
        isCatVisible={isCatVisible}
        toggleCatVisibility={toggleCatVisibility}
      />
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Catalog Manager</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Bulk manage your Facebook products and sets.</p>
          </div>

          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              <button
                onClick={() => setView(View.PRODUCTS)}
                className={`${
                  view === View.PRODUCTS
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
              >
                Products
              </button>
              <button
                onClick={() => setView(View.SETS)}
                className={`${
                  view === View.SETS
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
              >
                Product Sets
              </button>
              <button
                onClick={() => setView(View.LOGS)}
                className={`${
                  view === View.LOGS
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
              >
                History
              </button>
            </nav>
          </div>

          <div className="mt-8">
            {view === View.PRODUCTS && (
              <ProductManager 
                apiToken={credentials.token} 
                catalogId={credentials.catalogId} 
                cloudinaryCloudName={credentials.cloudinaryCloudName}
                cloudinaryUploadPreset={credentials.cloudinaryUploadPreset}
                logger={logger}
                playSound={playSound}
              />
            )}
            {view === View.SETS && (
              <SetManager 
                apiToken={credentials.token} 
                catalogId={credentials.catalogId} 
                logger={logger}
              />
            )}
             {view === View.LOGS && (
              <LogViewer logs={logs} onClear={() => setLogs([])} />
            )}
          </div>
        </div>
      </main>
      {isCatVisible && <WanderingCat />}
    </div>
  );
};

export default App;
