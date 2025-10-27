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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
            <svg className="mx-auto h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9.75l-9-5.25M12 12.75v9.75" />
            </svg>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Catalog Manager
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Connect your Facebook and Cloudinary accounts to begin.
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-8 space-y-6">
            <div className="space-y-4">
               <div>
                  <label htmlFor="app-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Facebook App ID</label>
                  <input
                    id="app-id"
                    name="appId"
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700"
                    placeholder="Enter App ID"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                  />
               </div>
                <div>
                  <label htmlFor="catalog-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Facebook Catalog ID</label>
                  <input
                    id="catalog-id"
                    name="catalogId"
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700"
                    placeholder="Enter Catalog ID"
                    value={catalogId}
                    onChange={(e) => setCatalogId(e.target.value)}
                  />
               </div>
               <div>
                    <label htmlFor="cloudinary-cloud-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cloudinary Cloud Name</label>
                    <input
                        id="cloudinary-cloud-name"
                        name="cloudinaryCloudName"
                        type="text"
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700"
                        placeholder="e.g., 'your-cloud'"
                        value={cloudinaryCloudName}
                        onChange={(e) => setCloudinaryCloudName(e.target.value)}
                    />
               </div>
                <div>
                    <label htmlFor="cloudinary-upload-preset" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cloudinary Upload Preset</label>
                    <input
                        id="cloudinary-upload-preset"
                        name="cloudinaryUploadPreset"
                        type="text"
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700"
                        placeholder="e.g., 'your-preset'"
                        value={cloudinaryUploadPreset}
                        onChange={(e) => setCloudinaryUploadPreset(e.target.value)}
                    />
                     <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
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