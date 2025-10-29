import React, { useState, useEffect } from 'react';
import { Product, NewProduct } from '../types';
import FacebookCatalogService from '../services/facebookService';
import { Spinner } from './Spinner';
import { uploadImage, uploadVideo } from '../services/imageUploadService';
import { Logger } from '../services/loggingService';

interface EditProductModalProps {
  onClose: () => void;
  service: FacebookCatalogService;
  product: Product;
  onProductUpdated: () => void;
  cloudinaryCloudName: string;
  cloudinaryUploadPreset: string;
  logger?: Logger;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'RUB'];

type EditableProductFields = Omit<NewProduct, 'retailer_id'>;

export const EditProductModal: React.FC<EditProductModalProps> = ({
  onClose,
  service,
  product,
  onProductUpdated,
  cloudinaryCloudName,
  cloudinaryUploadPreset,
  logger
}) => {
  const [formData, setFormData] = useState<EditableProductFields>({
    name: '',
    description: '',
    brand: '',
    link: '',
    price: 0,
    currency: 'USD',
    imageUrl: '',
    inventory: 0,
    videoUrl: '',
  });

  const [imageUploadState, setImageUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [imageUploadError, setImageUploadError] = useState('');
  const [localImagePreview, setLocalImagePreview] = useState('');
  
  const [videoUploadState, setVideoUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [videoUploadError, setVideoUploadError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        brand: product.brand,
        link: product.link,
        price: product.price,
        currency: product.currency,
        imageUrl: product.imageUrl,
        inventory: product.inventory,
        videoUrl: product.videoUrl || '',
      });
      setLocalImagePreview(product.imageUrl);
      setImageUploadState('idle');
      setVideoUploadState('idle');
    }
  }, [product]);

  const handleChange = (field: keyof EditableProductFields, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleFileChange = async (file: File | null) => {
    if (!file) return;

    setImageUploadState('uploading');
    setLocalImagePreview(URL.createObjectURL(file));
    
    try {
        const imageUrl = await uploadImage(file, cloudinaryCloudName, cloudinaryUploadPreset, logger);
        setFormData(prev => ({ ...prev, imageUrl }));
        setImageUploadState('success');
    } catch(err) {
        const errorMessage = err instanceof Error ? err.message : "Upload failed";
        setImageUploadState('error');
        setImageUploadError(errorMessage);
        // revert preview on error
        setLocalImagePreview(product.imageUrl); 
    }
  };

  const handleVideoFileChange = async (file: File | null) => {
    if (!file) return;

    setVideoUploadState('uploading');
    
    try {
        const videoUrl = await uploadVideo(file, cloudinaryCloudName, cloudinaryUploadPreset, logger);
        setFormData(prev => ({ ...prev, videoUrl }));
        setVideoUploadState('success');
    } catch(err) {
        const errorMessage = err instanceof Error ? err.message : "Upload failed";
        setVideoUploadState('error');
        setVideoUploadError(errorMessage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.link || !formData.imageUrl || formData.price <= 0 || formData.inventory < 0) {
      setError("Name, Link, and Image are required. Price must be > 0 and Quantity must be >= 0.");
      return;
    }
    
    if (imageUploadState === 'uploading' || videoUploadState === 'uploading') {
        setError("Please wait for all media to finish uploading.");
        return;
    }
    
    setIsSubmitting(true);
    try {
      await service.updateProduct(product.id, formData);
      onProductUpdated();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to update product: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyles = "block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700";

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Edit Product</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Product Name</label>
                <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} required className={inputStyles} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Brand</label>
                <input type="text" value={formData.brand} onChange={(e) => handleChange('brand', e.target.value)} required className={inputStyles} />
              </div>
            </div>
            <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Product Link (URL)</label>
                <input type="url" value={formData.link} onChange={(e) => handleChange('link', e.target.value)} required className={inputStyles} />
            </div>
            <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea value={formData.description} onChange={(e) => handleChange('description', e.target.value)} required className={inputStyles} rows={3}/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Price</label>
                <input type="number" step="0.01" min="0.01" value={formData.price} onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)} required className={inputStyles} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
                <select value={formData.currency} onChange={(e) => handleChange('currency', e.target.value)} className={inputStyles}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                <input type="number" min="0" value={formData.inventory} onChange={(e) => handleChange('inventory', parseInt(e.target.value, 10) || 0)} required className={inputStyles} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Product Image</label>
              <div className="mt-2 flex items-center gap-4">
                <img src={localImagePreview} alt="Product" className="h-20 w-20 object-cover rounded-md bg-gray-100 dark:bg-gray-700" />
                <div>
                  <label className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                    <span>Change Image</span>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)} className="sr-only" />
                  </label>
                  {imageUploadState === 'uploading' && <div className="text-sm text-gray-500 mt-2 flex items-center gap-2"><Spinner size="sm"/> Uploading...</div>}
                  {imageUploadState === 'success' && <div className="text-sm text-green-600 mt-2">Upload complete.</div>}
                  {imageUploadState === 'error' && <div className="text-sm text-red-500 mt-2">Error: {imageUploadError}</div>}
                </div>
              </div>
            </div>
             <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Product Video</label>
              <div className="mt-2 flex items-center gap-4">
                {formData.videoUrl ? (
                    <video key={formData.videoUrl} controls className="h-20 w-20 object-cover rounded-md bg-gray-100 dark:bg-gray-700">
                        <source src={formData.videoUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                ) : (
                    <div className="h-20 w-20 flex items-center justify-center text-center text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-md">
                        <span>No Video</span>
                    </div>
                )}
                <div>
                  <label className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                    <span>{formData.videoUrl ? 'Change Video' : 'Add Video'}</span>
                    <input type="file" accept="video/*" onChange={(e) => handleVideoFileChange(e.target.files ? e.target.files[0] : null)} className="sr-only" />
                  </label>
                  {videoUploadState === 'uploading' && <div className="text-sm text-gray-500 mt-2 flex items-center gap-2"><Spinner size="sm"/> Uploading...</div>}
                  {videoUploadState === 'success' && <div className="text-sm text-green-600 mt-2">Upload complete.</div>}
                  {videoUploadState === 'error' && <div className="text-sm text-red-500 mt-2">Error: {videoUploadError}</div>}
                </div>
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-red-500 text-center px-6 pb-4">{error}</p>}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t dark:border-gray-700 flex justify-end gap-3 sticky bottom-0">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-500 text-sm font-medium bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || imageUploadState === 'uploading' || videoUploadState === 'uploading'} className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2">
              {isSubmitting && <Spinner size="sm" />}
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};