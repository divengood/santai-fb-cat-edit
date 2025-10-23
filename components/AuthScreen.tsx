import React, { useState } from 'react';
import { Spinner } from './Spinner';
import { AuthCredentials } from '../App';

// Make FB object available from the script loaded in index.html
declare const FB: any;

interface AuthScreenProps {
  onConnect: (creds: AuthCredentials) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onConnect }) => {
  const [appId, setAppId] = useState('');
  const [catalogId, setCatalogId] = useState('');
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState('');
  const [cloudinaryUploadPreset, setCloudinaryUploadPreset] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = () => {
    setError('');
    if (!appId || !catalogId || !cloudinaryCloudName || !cloudinaryUploadPreset) {
        setError('All fields are required.');
        return;
    }
    
    setLoading(true);

    try {
        // Initialize the Facebook SDK
        FB.init({
            appId      : appId,
            cookie     : true,
            xfbml      : true,
            version    : 'v19.0'
        });

        // Trigger the login dialog
        FB.login((response: any) => {
            if (response.authResponse) {
                const accessToken = response.authResponse.accessToken;
                onConnect({ token: accessToken, appId, catalogId, cloudinaryCloudName, cloudinaryUploadPreset });
            } else {
                console.log('User cancelled login or did not fully authorize.');
                setError('Login failed. Please ensure you grant the necessary permissions.');
                setLoading(false);
            }
        }, { scope: 'catalog_management' });

    } catch (e) {
        console.error("Facebook SDK Error:", e);
        setError('Failed to initialize Facebook SDK. Check your App ID and network connection.');
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
            <svg className="mx-auto h-12 w-12 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" >
                 <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Catalog Manager
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Connect your Facebook and Cloudinary accounts to begin.
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg p-8 space-y-6">
            <div className="space-y-4">
               <div>
                  <label htmlFor="app-id" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Facebook App ID</label>
                  <input
                    id="app-id"
                    name="appId"
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700"
                    placeholder="Enter App ID"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                  />
               </div>
                <div>
                  <label htmlFor="catalog-id" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Facebook Catalog ID</label>
                  <input
                    id="catalog-id"
                    name="catalogId"
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700"
                    placeholder="Enter Catalog ID"
                    value={catalogId}
                    onChange={(e) => setCatalogId(e.target.value)}
                  />
               </div>
               <div>
                    <label htmlFor="cloudinary-cloud-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cloudinary Cloud Name</label>
                    <input
                        id="cloudinary-cloud-name"
                        name="cloudinaryCloudName"
                        type="text"
                        required
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700"
                        placeholder="e.g., 'your-cloud'"
                        value={cloudinaryCloudName}
                        onChange={(e) => setCloudinaryCloudName(e.target.value)}
                    />
               </div>
                <div>
                    <label htmlFor="cloudinary-upload-preset" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cloudinary Upload Preset</label>
                    <input
                        id="cloudinary-upload-preset"
                        name="cloudinaryUploadPreset"
                        type="text"
                        required
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700"
                        placeholder="e.g., 'your-preset'"
                        value={cloudinaryUploadPreset}
                        onChange={(e) => setCloudinaryUploadPreset(e.target.value)}
                    />
                     <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Find these in your Cloudinary Dashboard under Settings &gt; Upload. Create an <a href="https://cloudinary.com/documentation/upload_presets#unsigned_upload" target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:text-blue-500">'unsigned' preset</a>.
                    </p>
               </div>
            </div>
           
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <div>
            <button
              type="button"
              onClick={handleLogin}
              disabled={loading || !appId || !catalogId || !cloudinaryCloudName || !cloudinaryUploadPreset}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {loading && <Spinner size="sm" />}
              {loading ? 'Connecting...' : 'Login with Facebook'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};