
import React, { useState } from 'react';
import { NewProduct, Product } from '../types';
import FacebookCatalogService from '../services/facebookService';
import { Spinner } from './Spinner';
import { uploadVideo } from '../services/imageUploadService';
import { Logger } from '../services/loggingService';
import { ImageDropzone } from './ImageDropzone';

interface BulkAddProductsModalProps {
  onClose: () => void;
  service: FacebookCatalogService;
  onProductsAdded: () => void;
  existingProducts: Product[];
  cloudinaryCloudName: string;
  cloudinaryUploadPreset: string;
  logger?: Logger;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'RUB'];

interface ProductRowState extends Omit<NewProduct, 'retailer_id' | 'imageUrl' | 'additionalImageUrls'> {
  // Complex image state
  images: Array<{
    url: string;
    isMain: boolean;
    localPreview: string;
    id: string;
    status: 'uploading' | 'success' | 'error';
    error?: string;
  }>;

  // UI state for video upload
  videoUploadState: 'idle' | 'uploading' | 'success' | 'error';
  videoUploadError?: string;
  videoFileName?: string;
}

const emptyProductRow = (): ProductRowState => ({ 
  name: '', description: '', brand: '', link: '', price: 0, currency: 'USD', inventory: 1,
  images: [],
  videoUploadState: 'idle',
  videoUrl: '',
});

export const BulkAddProductsModal: React.FC<BulkAddProductsModalProps> = ({ onClose, service, onProductsAdded, existingProducts, cloudinaryCloudName, cloudinaryUploadPreset, logger }) => {
  const [productRows, setProductRows] = useState<ProductRowState[]>([{ ...emptyProductRow() }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleProductChange = (index: number, field: keyof Omit<ProductRowState, 'images' | 'videoUploadState' | 'videoUrl'>, value: string | number) => {
    const newProducts = [...productRows];
    (newProducts[index] as any)[field] = value;
    setProductRows(newProducts);
  };

  const handleImagesChange = (index: number, images: ProductRowState['images'] | ((prev: ProductRowState['images']) => ProductRowState['images'])) => {
    setProductRows(currentRows => {
        const finalRows = [...currentRows];
        if (typeof images === 'function') {
            finalRows[index].images = images(finalRows[index].images);
        } else {
            finalRows[index].images = images;
        }
        return finalRows;
    });
  };
  
  const handleVideoFileChange = async (index: number, file: File | null) => {
    if (!file) {
        setProductRows(currentRows => {
            const finalRows = [...currentRows];
            if(finalRows[index]){
                finalRows[index].videoUploadState = 'idle';
                finalRows[index].videoUploadError = undefined;
                finalRows[index].videoFileName = undefined;
                finalRows[index].videoUrl = '';
            }
            return finalRows;
        });
        return;
    }

    const newRows = [...productRows];
    newRows[index].videoUploadState = 'uploading';
    newRows[index].videoFileName = file.name;
    setProductRows(newRows);

    try {
        const videoUrl = await uploadVideo(file, cloudinaryCloudName, cloudinaryUploadPreset, logger);
        setProductRows(currentRows => {
            const finalRows = [...currentRows];
            if (finalRows[index]) {
                finalRows[index].videoUrl = videoUrl;
                finalRows[index].videoUploadState = 'success';
            }
            return finalRows;
        });
    } catch(err) {
        const errorMessage = err instanceof Error ? err.message : "Upload failed";
        setProductRows(currentRows => {
            const finalRows = [...currentRows];
            if(finalRows[index]){
                finalRows[index].videoUploadState = 'error';
                finalRows[index].videoUploadError = errorMessage;
            }
            return finalRows;
        });
    }
  };

  const handleApplyImagesToAll = (sourceIndex: number) => {
    const sourceRow = productRows[sourceIndex];
    if (sourceRow.images.length === 0 || sourceRow.images.some(img => img.status === 'uploading')) {
        return;
    }

    const { images } = sourceRow;
    logger?.info(`Applying ${images.length} image(s) from row ${sourceIndex + 1} to all other rows.`);

    setProductRows(currentRows => 
        currentRows.map((row, index) => {
            if (index === sourceIndex) {
                return row;
            }
            return {
                ...row,
                images: images.map(img => ({ ...img })), // Distinct copies
            };
        })
    );
  };


  const addProductRow = () => {
    setProductRows([...productRows, emptyProductRow()]);
  };

  const removeProductRow = (index: number) => {
    if (productRows.length > 1) {
      setProductRows(productRows.filter((_, i) => i !== index));
    }
  };

  const duplicateProductRow = (index: number) => {
    const numCopiesStr = window.prompt("How many copies would you like to create?", "1");
    if (numCopiesStr === null) return;
    
    const numCopies = parseInt(numCopiesStr, 10);
    if (isNaN(numCopies) || numCopies < 1) {
      alert("Please enter a valid number greater than 0.");
      return;
    }

    const productToCopyTemplate = { ...productRows[index] };
    
    const newCopies: ProductRowState[] = [];
    for (let i = 0; i < numCopies; i++) {
        const newCopy: ProductRowState = {
            ...productToCopyTemplate,
            images: productToCopyTemplate.images.map(img => ({ ...img })), // Deep copy images
            videoUploadState: 'idle',
            videoUrl: '',
            videoFileName: undefined,
            videoUploadError: undefined,
        };
        newCopies.push(newCopy);
    }

    const newProducts = [...productRows];
    newProducts.splice(index + 1, 0, ...newCopies);
    setProductRows(newProducts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const existingRetailerIds = new Set(existingProducts.map(p => p.retailer_id));
    const productsToSubmit: NewProduct[] = [];

    for (const p_row of productRows) {
        let newRetailerId = '';
        do {
            newRetailerId = Math.floor(100000 + Math.random() * 900000).toString();
        } while (existingRetailerIds.has(newRetailerId));
        
        existingRetailerIds.add(newRetailerId); 

        const mainImage = p_row.images.find(img => img.isMain && img.status === 'success')?.url;
        const additionalImages = p_row.images
            .filter(img => !img.isMain && img.status === 'success')
            .map(img => img.url);
        
        if (!mainImage && p_row.images.length > 0) {
            setError(`Row with product "${p_row.name || 'Unnamed'}" has no main image set.`);
            return;
        }

        const { 
            images,
            videoUploadState, videoUploadError, videoFileName, 
            ...productData 
        } = p_row;
        
        productsToSubmit.push({
            ...productData,
            retailer_id: newRetailerId,
            imageUrl: mainImage || '',
            additionalImageUrls: additionalImages,
        });
    }

    const hasInvalidProducts = productsToSubmit.some(p => !p.name || !p.link || !p.imageUrl || p.price <= 0 || p.inventory < 0);
    if(hasInvalidProducts){
      setError("Name, Link, and Main Image are required. Price must be > 0 and Quantity must be >= 0.");
      return;
    }
    
    const isMediaUploading = productRows.some(p => 
        p.images.some(img => img.status === 'uploading') || 
        p.videoUploadState === 'uploading'
    );
    if(isMediaUploading){
        setError("Please wait for all media to finish uploading.");
        return;
    }
    
    setIsSubmitting(true);
    try {
      await service.addProducts(productsToSubmit);
      onProductsAdded();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setError(`Failed to add products: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const isAnyMediaUploading = productRows.some(p => 
    p.images.some(img => img.status === 'uploading') || 
    p.videoUploadState === 'uploading'
  );
  
  const inputStyles = "block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700";

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Bulk Add Products</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
          <div className="p-6 space-y-8">
            {productRows.map((product, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-900/50 border dark:border-gray-700 p-6 rounded-md relative space-y-6">
                <div className="absolute top-3 right-3 flex items-center gap-2">
                    <button type="button" onClick={() => duplicateProductRow(index)} title="Duplicate Row" className="text-gray-400 hover:text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                    <button type="button" onClick={() => removeProductRow(index)} title="Remove Row" className="text-gray-400 hover:text-red-500 disabled:text-gray-300 dark:disabled:text-gray-500" disabled={productRows.length <= 1}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Product Name" value={product.name} onChange={(e) => handleProductChange(index, 'name', e.target.value)} required className={inputStyles} />
                    <input type="text" placeholder="Brand" value={product.brand} onChange={(e) => handleProductChange(index, 'brand', e.target.value)} required className={inputStyles} />
                </div>
                 <input type="url" placeholder="Product Link (URL)" value={product.link} onChange={(e) => handleProductChange(index, 'link', e.target.value)} required className={inputStyles} />
                <textarea placeholder="Description" value={product.description} onChange={(e) => handleProductChange(index, 'description', e.target.value)} required className={inputStyles} rows={2}/>
                
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="number" step="0.01" min="0.01" placeholder="Price" value={product.price} onChange={(e) => handleProductChange(index, 'price', parseFloat(e.target.value) || 0)} required className={inputStyles} />
                    <select value={product.currency} onChange={(e) => handleProductChange(index, 'currency', e.target.value)} className={inputStyles}>
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="number" min="0" placeholder="Quantity" value={product.inventory} onChange={(e) => handleProductChange(index, 'inventory', parseInt(e.target.value, 10) || 0)} required className={inputStyles} />
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Product Images</label>
                        {productRows.length > 1 && product.images.length > 0 && (
                            <button 
                                type="button" 
                                onClick={() => handleApplyImagesToAll(index)}
                                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                Apply images to all other rows
                            </button>
                        )}
                    </div>
                    <ImageDropzone 
                        images={product.images}
                        onImagesChange={(imgs) => handleImagesChange(index, imgs)}
                        cloudinaryCloudName={cloudinaryCloudName}
                        cloudinaryUploadPreset={cloudinaryUploadPreset}
                        logger={logger}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Product Video (Optional)</label>
                    {product.videoUploadState === 'idle' && (
                        <label className="w-full flex items-center justify-center px-3 py-2 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                            <span className="text-sm text-gray-500 dark:text-gray-300">Upload Video</span>
                            <input type="file" accept="video/*" onChange={(e) => handleVideoFileChange(index, e.target.files ? e.target.files[0] : null)} className="hidden"/>
                        </label>
                    )}
                    {product.videoUploadState === 'uploading' && (
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 px-3 py-2 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                            <Spinner size="sm" />
                            <span>Uploading Video...</span>
                        </div>
                    )}
                    {product.videoUploadState === 'success' && (
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            <span className="truncate">{product.videoFileName}</span>
                            <button type="button" onClick={() => handleVideoFileChange(index, null)} className="ml-auto text-xs text-red-500 hover:underline">Remove</button>
                        </div>
                    )}
                    {product.videoUploadState === 'error' && (
                        <div className="text-sm text-red-500">
                            <p className="truncate">Error: {product.videoUploadError}</p>
                            <label className="text-blue-500 hover:underline cursor-pointer">
                                Try again
                                <input type="file" accept="video/*" onChange={(e) => handleVideoFileChange(index, e.target.files ? e.target.files[0] : null)} className="hidden"/>
                            </label>
                        </div>
                    )}
                </div>
              </div>
            ))}
            <button type="button" onClick={addProductRow} className="text-blue-600 dark:text-blue-400 font-medium text-sm hover:text-blue-500">
              + Add another product
            </button>
          </div>
           {error && <p className="text-sm text-red-500 text-center px-6 pb-4">{error}</p>}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t dark:border-gray-700 flex justify-end gap-3 sticky bottom-0 z-10">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-500 text-sm font-medium bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || isAnyMediaUploading} className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2">
              {isSubmitting && <Spinner size="sm" />}
              {isSubmitting ? 'Adding...' : `Add ${productRows.length} Products`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
