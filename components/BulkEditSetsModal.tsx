import React, { useState, useMemo } from 'react';
import { Product, ProductSet } from '../types';
import FacebookCatalogService from '../services/facebookService';
import { Spinner } from './Spinner';
import { Logger } from '../services/loggingService';

interface BulkEditSetsModalProps {
  onClose: () => void;
  service: FacebookCatalogService;
  setsToEdit: ProductSet[];
  allProducts: Product[];
  onSetsUpdated: () => void;
  logger?: Logger;
}

const ProductListSection: React.FC<{ title: string; products: Product[]; selectedIds: Set<string>; onToggle: (id: string) => void; }> = ({ title, products, selectedIds, onToggle }) => {
    const [nameFilter, setNameFilter] = useState('');
    const [brandFilter, setBrandFilter] = useState('');

    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const nameMatch = nameFilter ? product.name.toLowerCase().includes(nameFilter.toLowerCase()) : true;
            const brandMatch = brandFilter ? product.brand.toLowerCase().includes(brandFilter.toLowerCase()) : true;
            return nameMatch && brandMatch;
        });
    }, [products, nameFilter, brandFilter]);

    const inputStyles = "block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600";

    return (
        <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{title} ({selectedIds.size})</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
                <input type="text" placeholder="Filter by name..." value={nameFilter} onChange={e => setNameFilter(e.target.value)} className={inputStyles} />
                <input type="text" placeholder="Filter by brand..." value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className={inputStyles} />
            </div>
            {products.length > 0 ? (
                <ul className="border border-slate-200 dark:border-slate-700 rounded-md divide-y divide-slate-200 dark:divide-slate-700 max-h-40 overflow-y-auto">
                    {filteredProducts.map(product => (
                        <li key={product.id} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <div className="w-0 flex-1 flex items-center">
                                <input type="checkbox" id={`product-bulk-${product.id}`} checked={selectedIds.has(product.id)} onChange={() => onToggle(product.id)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded dark:bg-slate-700 dark:border-slate-600" />
                                <label htmlFor={`product-bulk-${product.id}`} className="ml-3 flex-1 w-0 truncate cursor-pointer flex items-center gap-3">
                                    <img src={product.imageUrl} alt={product.name} className="h-8 w-8 rounded-md object-cover"/>
                                    <span className="font-medium">{product.name}</span>
                                </label>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No products available.</p>}
        </div>
    );
};


export const BulkEditSetsModal: React.FC<BulkEditSetsModalProps> = ({ onClose, service, setsToEdit, allProducts, onSetsUpdated, logger }) => {
  const [productsToAdd, setProductsToAdd] = useState<Set<string>>(new Set());
  const [productsToRemove, setProductsToRemove] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const toggleProductToAdd = (productId: string) => {
    setProductsToAdd(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(productId)) newSelection.delete(productId);
        else newSelection.add(productId);
        return newSelection;
    });
  };

  const toggleProductToRemove = (productId: string) => {
    setProductsToRemove(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(productId)) newSelection.delete(productId);
        else newSelection.add(productId);
        return newSelection;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (productsToAdd.size === 0 && productsToRemove.size === 0) {
        setError("No changes to apply. Please select products to add or remove.");
        return;
    }
    setError('');
    setIsSubmitting(true);
    logger?.info(`Starting bulk update for ${setsToEdit.length} set(s)...`);

    try {
        const updatePromises = setsToEdit.map(set => {
            const currentIds = new Set(set.productIds);
            productsToAdd.forEach(id => currentIds.add(id));
            productsToRemove.forEach(id => currentIds.delete(id));
            
            logger?.info(`Updating set "${set.name}" with ${currentIds.size} products.`);
            return service.updateSet(set.id, set.name, Array.from(currentIds));
        });

        await Promise.all(updatePromises);
        onSetsUpdated();
        onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to bulk update sets: ${errorMessage}`);
      logger?.error("Bulk set update failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
     <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold">Bulk Edit Sets ({setsToEdit.length})</h2>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden">
            <div className="p-6 flex-grow overflow-y-auto space-y-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Changes will be applied to all {setsToEdit.length} selected sets. Product name editing is disabled in bulk mode.
                </p>
                
                <ProductListSection 
                    title="Add these products"
                    products={allProducts}
                    selectedIds={productsToAdd}
                    onToggle={toggleProductToAdd}
                />
                
                 <ProductListSection 
                    title="Remove these products (if they exist in the set)"
                    products={allProducts}
                    selectedIds={productsToRemove}
                    onToggle={toggleProductToRemove}
                />
            </div>
             {error && <p className="text-sm text-red-500 text-center px-6 pb-4">{error}</p>}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 border-t dark:border-slate-700 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-600 text-sm font-medium bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-slate-400 flex items-center gap-2">
                    {isSubmitting && <Spinner size="sm" />}
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};