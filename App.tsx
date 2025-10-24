import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { ProductManager } from './components/ProductManager';
import { SetManager } from './components/SetManager';
import { AuthScreen } from './components/AuthScreen';
import { LogEntry } from './types';
import { Logger } from './services/loggingService';
import { LogViewer } from './components/LogViewer';

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
  
  const logger = useMemo(() => new Logger(setLogs), [setLogs]);

  useEffect(() => {
    if (credentials) {
        localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
    } else {
        localStorage.removeItem(CREDENTIALS_KEY);
    }
  }, [credentials]);

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      <Header onDisconnect={handleDisconnect} />
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Catalog Manager</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Bulk manage your Facebook products and sets.</p>
          </div>

          <div className="border-b border-slate-200 dark:border-slate-700">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              <button
                onClick={() => setView(View.PRODUCTS)}
                className={`${
                  view === View.PRODUCTS
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
              >
                Products
              </button>
              <button
                onClick={() => setView(View.SETS)}
                className={`${
                  view === View.SETS
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
              >
                Product Sets
              </button>
              <button
                onClick={() => setView(View.LOGS)}
                className={`${
                  view === View.LOGS
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600'
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
    </div>
  );
};

export default App;