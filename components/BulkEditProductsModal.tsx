
import React, { useState, useEffect } from 'react';
import { Product, NewProduct } from '../types';
import FacebookCatalogService from '../services/facebookService';
import { Spinner } from './Spinner';
import { uploadVideo } from '../services/imageUploadService';
import { Logger } from '../services/loggingService';
import { ImageDropzone } from './ImageDropzone';

interface BulkEditProductsModalProps {
  onClose: () => void;
  service: FacebookCatalogService;
  selectedProducts: Product[];
  onProductsUpdated: () => void;
  cloudinaryCloudName: string;
  cloudinaryUploadPreset: string;
  logger?: Logger;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'RUB'];

interface ProductEditRowState extends Omit<NewProduct, 'retailer_id' | 'imageUrl' | 'additionalImageUrls'> {
  id: string;
  retailer_id: string;
  images: Array<{
    url: string;
    isMain: boolean;
    localPreview: string;
    id: string;
    status: 'uploading' | 'success' | 'error';
    error?: string;
  }>;
  videoUploadState: 'idle' | 'uploading' | 'success' | 'error';
  videoUploadError?: string;
  videoFileName?: string;
}

export const BulkEditProductsModal: React.FC<BulkEditProductsModalProps> = ({ onClose, service, selectedProducts, onProductsUpdated, cloudinaryCloudName, cloudinaryUploadPreset, logger }) => {
  const [productRows, setProductRows] = useState<ProductEditRowState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const rows = selectedProducts.map(p => {
        const rowImages = [];
        if (p.imageUrl) {
            rowImages.push({ id: 'main-' + Math.random().toString(36).substr(2, 9), url: p.imageUrl, isMain: true, localPreview: p.imageUrl, status: 'success' as const });
        }
        if (p.additionalImageUrls) {
            p.additionalImageUrls.forEach(url => {
                rowImages.push({ id: 'add-' + Math.random().toString(36).substr(2, 9), url, isMain: false, localPreview: url, status: 'success' as const });
            });
        }

        return {
            id: p.id,
            retailer_id: p.retailer_id,
            name: p.name,
            description: p.description,
            brand: p.brand,
            link: p.link,
            price: p.price,
            currency: p.currency,
            inventory: p.inventory,
            videoUrl: p.videoUrl || '',
            images: rowImages,
            videoUploadState: 'idle' as const,
        };
    });
    setProductRows(rows);
  }, [selectedProducts]);

  const handleProductChange = (index: number, field: keyof ProductEditRowState, value: any) => {
    const newRows = [...productRows];
    (newRows[index] as any)[field] = value;
    setProductRows(newRows);
  };

  const applyToAll = (field: keyof ProductEditRowState) => {
    if (productRows.length < 2) return;
    const valueToCopy = productRows[0][field];
    
    // For arrays like images, we need a deep copy
    setProductRows(currentRows => currentRows.map((row, idx) => {
        if (idx === 0) return row;
        let newValue = valueToCopy;
        if (field === 'images') {
            newValue = (valueToCopy as any[]).map(img => ({ ...img }));
        }
        return { ...row, [field]: newValue };
    }));
    
    logger?.info(`Applied "${field}" from first product to all other rows.`);
  };

  const setLastImageAsMainForAll = () => {
    setProductRows(currentRows => currentRows.map(row => {
        if (row.images.length === 0) return row;
        
        // Find the index of the last successful image
        const lastSuccessIdx = row.images.reduce((last, img, idx) => 
            img.status === 'success' ? idx : last, -1);
            
        if (lastSuccessIdx === -1) return row;

        const updatedImages = row.images.map((img, idx) => ({
            ...img,
            isMain: idx === lastSuccessIdx
        }));

        return { ...row, images: updatedImages };
    }));
    logger?.info("Set the last successful image as main for all product rows.");
  };

  const handleVideoFileChange = async (index: number, file: File | null) => {
    if (!file) {
        handleProductChange(index, 'videoUrl', '');
        handleProductChange(index, 'videoUploadState', 'idle');
        return;
    }

    handleProductChange(index, 'videoUploadState', 'uploading');
    handleProductChange(index, 'videoFileName', file.name);

    try {
        const videoUrl = await uploadVideo(file, cloudinaryCloudName, cloudinaryUploadPreset, logger);
        handleProductChange(index, 'videoUrl', videoUrl);
        handleProductChange(index, 'videoUploadState', 'success');
    } catch(err) {
        handleProductChange(index, 'videoUploadState', 'error');
        handleProductChange(index, 'videoUploadError', err instanceof Error ? err.message : "Upload failed");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const updates = productRows.map(row => {
        const mainImage = row.images.find(img => img.isMain && img.status === 'success')?.url;
        const additionalImages = row.images.filter(img => !img.isMain && img.status === 'success').map(img => img.url);

        return {
            id: row.id,
            data: {
                name: row.name,
                description: row.description,
                brand: row.brand,
                link: row.link,
                price: row.price,
                currency: row.currency,
                inventory: row.inventory,
                videoUrl: row.videoUrl,
                imageUrl: mainImage,
                additionalImageUrls: additionalImages
            }
        };
    });

    // Validation
    const invalid = updates.some(u => !u.data.name || !u.data.link || !u.data.imageUrl || Number(u.data.price) <= 0);
    if (invalid) {
        setError("Name, Link, Main Image, and a positive Price are required for all items.");
        return;
    }

    if (productRows.some(row => row.images.some(img => img.status === 'uploading') || row.videoUploadState === 'uploading')) {
        setError("Please wait for media to finish uploading.");
        return;
    }

    setIsSubmitting(true);
    try {
        await service.updateProductsBatch(updates);
        onProductsUpdated();
        onClose();
    } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update products.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const inputStyles = "block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700";

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold">Bulk Edit Products</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Editing {selectedProducts.length} items</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-2 border-b border-blue-100 dark:border-blue-800 flex flex-wrap gap-x-4 gap-y-2 items-center text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-tighter">
            <div className="flex items-center gap-2">
                <span>Bulk Actions:</span>
                <button 
                  type="button" 
                  onClick={setLastImageAsMainForAll} 
                  className="px-2 py-1 bg-blue-600 text-white border border-blue-700 rounded hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Last Image as Main
                </button>
            </div>
            
            <div className="w-px h-4 bg-blue-200 dark:bg-blue-800 hidden sm:block" />

            <div className="flex items-center gap-2">
                <span>Sync from 1st Row:</span>
                <button type="button" onClick={() => applyToAll('brand')} className="px-2 py-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded hover:bg-blue-100 transition-colors">Brand</button>
                <button type="button" onClick={() => applyToAll('price')} className="px-2 py-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded hover:bg-blue-100 transition-colors">Price</button>
                <button type="button" onClick={() => applyToAll('currency')} className="px-2 py-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded hover:bg-blue-100 transition-colors">Currency</button>
                <button type="button" onClick={() => applyToAll('inventory')} className="px-2 py-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded hover:bg-blue-100 transition-colors">Quantity</button>
                <button type="button" onClick={() => applyToAll('images')} className="px-2 py-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded hover:bg-blue-100 transition-colors">All Images</button>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
          <div className="p-6 space-y-12">
            {productRows.map((product, index) => (
              <div key={product.id} className="relative bg-gray-50 dark:bg-gray-900/40 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="absolute -top-3 left-4 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow">
                    ITEM #{index + 1} (SKU: {product.retailer_id})
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Product Name</label>
                      <input type="text" value={product.name} onChange={(e) => handleProductChange(index, 'name', e.target.value)} required className={inputStyles} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Brand</label>
                      <input type="text" value={product.brand} onChange={(e) => handleProductChange(index, 'brand', e.target.value)} required className={inputStyles} />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Description</label>
                    <textarea value={product.description} onChange={(e) => handleProductChange(index, 'description', e.target.value)} required className={inputStyles} rows={2} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Price</label>
                      <input type="number" step="0.01" min="0.01" value={product.price} onChange={(e) => handleProductChange(index, 'price', e.target.valueAsNumber || 0)} required className={inputStyles} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Currency</label>
                      <select value={product.currency} onChange={(e) => handleProductChange(index, 'currency', e.target.value)} className={inputStyles}>
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Quantity</label>
                      <input type="number" min="0" value={product.inventory} onChange={(e) => handleProductChange(index, 'inventory', e.target.valueAsNumber || 0)} required className={inputStyles} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Images</label>
                    <ImageDropzone 
                        images={product.images}
                        onImagesChange={(imgs) => handleProductChange(index, 'images', imgs)}
                        cloudinaryCloudName={cloudinaryCloudName}
                        cloudinaryUploadPreset={cloudinaryUploadPreset}
                        logger={logger}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Video</label>
                    <div className="flex items-center gap-4">
                      {product.videoUrl && (
                        <div className="h-16 w-16 bg-black rounded overflow-hidden">
                           <video className="h-full w-full object-cover">
                             <source src={product.videoUrl} type="video/mp4"/>
                           </video>
                        </div>
                      )}
                      <label className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs font-bold uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                        {product.videoUrl ? 'Change Video' : 'Add Video'}
                        <input type="file" accept="video/*" className="hidden" onChange={(e) => handleVideoFileChange(index, e.target.files ? e.target.files[0] : null)} />
                      </label>
                      {product.videoUploadState === 'uploading' && <Spinner size="sm"/>}
                      {product.videoUploadState === 'success' && <span className="text-green-500 text-[10px] font-bold">OK</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && <div className="p-4 mx-6 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm font-bold rounded-lg text-center">{error}</div>}

          <div className="sticky bottom-0 px-6 py-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 flex justify-end gap-3 z-10">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-bold hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2 shadow-lg transition-transform active:scale-95">
              {isSubmitting && <Spinner size="sm" />}
              Save All Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
