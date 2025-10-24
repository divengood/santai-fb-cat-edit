import React, { useState } from 'react';
import { NewProduct, Product } from '../types';
import FacebookCatalogService from '../services/facebookService';
import { Spinner } from './Spinner';
import { uploadImage } from '../services/imageUploadService';
import { Logger } from '../services/loggingService';

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

interface ProductRowState extends Omit<NewProduct, 'retailer_id'> {
  // UI state for image upload
  imageUploadState: 'idle' | 'uploading' | 'success' | 'error';
  imageUploadError?: string;
  localImagePreview?: string;
  fileName?: string;
}

const emptyProductRow: ProductRowState = { 
  name: '', description: '', brand: '', link: '', price: 0, currency: 'USD', imageUrl: '', inventory: 1,
  imageUploadState: 'idle' 
};

export const BulkAddProductsModal: React.FC<BulkAddProductsModalProps> = ({ onClose, service, onProductsAdded, existingProducts, cloudinaryCloudName, cloudinaryUploadPreset, logger }) => {
  const [productRows, setProductRows] = useState<ProductRowState[]>([{ ...emptyProductRow }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showCreateSetConfirm, setShowCreateSetConfirm] = useState(false);
  const [productsReadyForSubmit, setProductsReadyForSubmit] = useState<NewProduct[] | null>(null);


  const handleProductChange = (index: number, field: keyof Omit<NewProduct, 'retailer_id'>, value: string | number) => {
    const newProducts = [...productRows];
    (newProducts[index] as any)[field] = value;
    setProductRows(newProducts);
  };
  
  const handleFileChange = async (index: number, file: File | null) => {
    if (!file) {
         setProductRows(currentRows => {
            const finalRows = [...currentRows];
            if(finalRows[index]){
                finalRows[index].imageUploadState = 'idle';
                finalRows[index].imageUploadError = undefined;
                finalRows[index].fileName = undefined;
                finalRows[index].localImagePreview = undefined;
                finalRows[index].imageUrl = '';
            }
            return finalRows;
        });
        return;
    }

    const newRows = [...productRows];
    newRows[index].imageUploadState = 'uploading';
    newRows[index].fileName = file.name;
    newRows[index].localImagePreview = URL.createObjectURL(file);
    setProductRows(newRows);
    
    try {
        const imageUrl = await uploadImage(file, cloudinaryCloudName, cloudinaryUploadPreset, logger);
        // Important: Read state again inside async function to avoid stale state
        setProductRows(currentRows => {
            const finalRows = [...currentRows];
            if (finalRows[index]) {
                finalRows[index].imageUrl = imageUrl;
                finalRows[index].imageUploadState = 'success';
            }
            return finalRows;
        });
    } catch(err) {
        const errorMessage = err instanceof Error ? err.message : "Upload failed";
        setProductRows(currentRows => {
            const finalRows = [...currentRows];
            if(finalRows[index]){
                finalRows[index].imageUploadState = 'error';
                finalRows[index].imageUploadError = errorMessage;
            }
            return finalRows;
        });
    }
  };

  const handleApplyImageToAll = (sourceIndex: number) => {
    const sourceRow = productRows[sourceIndex];
    if (sourceRow.imageUploadState !== 'success' || !sourceRow.imageUrl) {
        return;
    }

    const { imageUrl, localImagePreview, fileName } = sourceRow;
    logger?.info(`Applying image from row ${sourceIndex + 1} to all other rows.`);

    setProductRows(currentRows => 
        currentRows.map((row, index) => {
            if (index === sourceIndex) {
                return row;
            }
            return {
                ...row,
                imageUrl,
                localImagePreview,
                fileName,
                imageUploadState: 'success',
                imageUploadError: undefined,
            };
        })
    );
  };


  const addProductRow = () => {
    setProductRows([...productRows, { ...emptyProductRow }]);
  };

  const removeProductRow = (index: number) => {
    if (productRows.length > 1) {
      setProductRows(productRows.filter((_, i) => i !== index));
    }
  };

  const duplicateProductRow = (index: number) => {
    const productToCopy: ProductRowState = { ...productRows[index] };
    // Reset image state for the new row
    productToCopy.imageUploadState = 'idle';
    productToCopy.imageUrl = '';
    productToCopy.fileName = undefined;
    productToCopy.localImagePreview = undefined;
    productToCopy.imageUploadError = undefined;

    const newProducts = [...productRows];
    newProducts.splice(index + 1, 0, productToCopy);
    setProductRows(newProducts);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const existingRetailerIds = new Set(existingProducts.map(p => p.retailer_id));
    const productsToSubmit: NewProduct[] = [];

    for (const p_row of productRows) {
        let newRetailerId = '';
        do {
            newRetailerId = Math.floor(100000 + Math.random() * 900000).toString();
        } while (existingRetailerIds.has(newRetailerId));
        
        existingRetailerIds.add(newRetailerId); // Ensure uniqueness within the batch

        const { imageUploadState, imageUploadError, localImagePreview, fileName, ...productData } = p_row;
        productsToSubmit.push({
            ...productData,
            retailer_id: newRetailerId,
        });
    }

    const hasInvalidProducts = productsToSubmit.some(p => !p.name || !p.link || !p.imageUrl || p.price <= 0 || p.inventory < 0);
    if(hasInvalidProducts){
      setError("Name, Link, and Image are required. Price must be > 0 and Quantity must be >= 0.");
      return;
    }
    
    const isUploading = productRows.some(p => p.imageUploadState === 'uploading');
    if(isUploading){
        setError("Please wait for all images to finish uploading.");
        return;
    }
    
    setProductsReadyForSubmit(productsToSubmit);
    setShowCreateSetConfirm(true);
  };

  const handleConfirmation = async (shouldCreateSets: boolean) => {
    if (!productsReadyForSubmit) return;

    setShowCreateSetConfirm(false);
    setIsSubmitting(true);
    setError('');

    try {
        const addProductResponses = await service.addProducts(productsReadyForSubmit);
        
        if (shouldCreateSets) {
            const setsToCreate: { name: string; productIds: string[] }[] = [];
            addProductResponses.forEach((res: any, index: number) => {
                if (res && res.code === 200) {
                    try {
                        const body = JSON.parse(res.body);
                        const newProductId = body.id;
                        const originalProduct = productsReadyForSubmit[index];
                        if (newProductId && originalProduct.brand?.trim()) {
                            setsToCreate.push({
                                name: originalProduct.brand.trim(),
                                productIds: [newProductId]
                            });
                        }
                    } catch(e) {
                         logger?.warn(`Could not parse product creation response for item at index ${index}. Set will not be created.`);
                    }
                }
            });

            if (setsToCreate.length > 0) {
                await service.createSetsBatch(setsToCreate);
                logger?.success(`Submitted requests to create ${setsToCreate.length} sets for the new products.`);
            }
        }

        onProductsAdded();
        onClose();
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(`Operation failed: ${errorMessage}`);
    } finally {
        setIsSubmitting(false);
        setProductsReadyForSubmit(null);
    }
  };
  
  const isAnyImageUploading = productRows.some(p => p.imageUploadState === 'uploading');
  
  const inputStyles = "block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col relative">
        {showCreateSetConfirm && (
            <div className="absolute inset-0 bg-slate-900 bg-opacity-70 z-10 flex justify-center items-center p-4 rounded-lg">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md text-center" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
                    <h3 id="dialog-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create a separate set for each product?</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        A new set will be created for each product.
                        <br />
                        <span className="text-xs">(The set name will be taken from the "Brand" field)</span>
                    </p>
                    <div className="flex justify-center gap-3 mt-6">
                        <button type="button" onClick={() => { setShowCreateSetConfirm(false); setProductsReadyForSubmit(null); }} className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-600 text-sm font-medium bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                            Cancel
                        </button>
                        <button type="button" onClick={() => handleConfirmation(false)} className="px-4 py-2 rounded-md bg-slate-600 text-white text-sm font-medium hover:bg-slate-700">
                            No
                        </button>
                        <button type="button" onClick={() => handleConfirmation(true)} className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
                            Yes
                        </button>
                    </div>
                </div>
            </div>
        )}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold">Bulk Add Products</h2>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
          <div className="p-6 space-y-6">
            {productRows.map((product, index) => (
              <div key={index} className="bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700 p-4 rounded-md relative space-y-4">
                <div className="absolute top-3 right-3 flex items-center gap-2">
                    <button type="button" onClick={() => duplicateProductRow(index)} title="Duplicate Row" className="text-slate-400 hover:text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                    <button type="button" onClick={() => removeProductRow(index)} title="Remove Row" className="text-slate-400 hover:text-red-500 disabled:text-slate-300 dark:disabled:text-slate-500" disabled={productRows.length <= 1}>
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
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                        <input type="number" step="0.01" min="0.01" placeholder="Price" value={product.price} onChange={(e) => handleProductChange(index, 'price', parseFloat(e.target.value) || 0)} required className={inputStyles} />
                        <select value={product.currency} onChange={(e) => handleProductChange(index, 'currency', e.target.value)} className={inputStyles}>
                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                         <input type="number" min="0" placeholder="Quantity" value={product.inventory} onChange={(e) => handleProductChange(index, 'inventory', parseInt(e.target.value, 10) || 0)} required className={inputStyles} />
                    </div>
                    <div>
                        {product.imageUploadState === 'idle' && (
                            <label className="w-full flex items-center justify-center px-3 py-2 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                                <span className="text-sm text-slate-500 dark:text-slate-300">Upload Image</span>
                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(index, e.target.files ? e.target.files[0] : null)} className="hidden"/>
                            </label>
                        )}
                        {product.imageUploadState === 'uploading' && (
                            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400 px-3 py-2 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md">
                                <Spinner size="sm" />
                                <span>Uploading...</span>
                            </div>
                        )}
                        {product.imageUploadState === 'success' && product.localImagePreview && (
                            <div className="flex items-center gap-2 text-sm">
                                <img src={product.localImagePreview} alt="preview" className="h-10 w-10 object-cover rounded flex-shrink-0"/>
                                <div className="flex-grow truncate">
                                   <span className="truncate text-green-600 dark:text-green-400">{product.fileName}</span>
                                </div>
                                {productRows.length > 1 && (
                                    <button 
                                        type="button" 
                                        onClick={() => handleApplyImageToAll(index)}
                                        className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0 px-2"
                                        title="Apply this image to all other product rows"
                                    >
                                        Apply to all
                                    </button>
                                )}
                            </div>
                        )}
                        {product.imageUploadState === 'error' && (
                            <div className="text-sm text-red-500">
                            <p className="truncate">Error: {product.imageUploadError}</p>
                            <label className="text-blue-500 hover:underline cursor-pointer">
                                    Try again
                                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(index, e.target.files ? e.target.files[0] : null)} className="hidden"/>
                            </label>
                            </div>
                        )}
                    </div>
                 </div>
              </div>
            ))}
            <button type="button" onClick={addProductRow} className="text-blue-600 dark:text-blue-400 font-medium text-sm hover:text-blue-500">
              + Add another product
            </button>
          </div>
           {error && <p className="text-sm text-red-500 text-center px-6 pb-4">{error}</p>}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 border-t dark:border-slate-700 flex justify-end gap-3 sticky bottom-0">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-600 text-sm font-medium bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || isAnyImageUploading || showCreateSetConfirm} className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-slate-400 flex items-center gap-2">
              {isSubmitting && <Spinner size="sm" />}
              {isSubmitting ? 'Adding...' : `Add ${productRows.length} Products`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};