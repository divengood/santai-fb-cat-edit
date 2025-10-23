import React, { useState, useMemo } from 'react';
import { Product, ProductSet } from '../types';
import FacebookCatalogService from '../services/facebookService';
import { Spinner } from './Spinner';
import { Logger } from '../services/loggingService';

interface EditSetModalProps {
  onClose: () => void;
  service: FacebookCatalogService;
  set: ProductSet;
  allProducts: Product[];
  onSetUpdated: () => void;
  logger?: Logger;
}

export const EditSetModal: React.FC<EditSetModalProps> = ({ onClose, service, set, allProducts, onSetUpdated }) => {
  const [setName, setSetName] = useState(set.name);
  const [currentProductIds, setCurrentProductIds] = useState<Set<string>>(new Set(set.productIds));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');

  const productsInSet = useMemo(() => {
    const productMap = new Map(allProducts.map(p => [p.id, p]));
    return Array.from(currentProductIds)
      .map(id => productMap.get(id))
      .filter((p): p is Product => p !== undefined);
  }, [allProducts, currentProductIds]);
  
  const availableProducts = useMemo(() => {
    return allProducts.filter(product => {
      if (currentProductIds.has(product.id)) {
        return false;
      }
      const nameMatch = nameFilter ? product.name.toLowerCase().includes(nameFilter.toLowerCase()) : true;
      const brandMatch = brandFilter ? product.brand.toLowerCase().includes(brandFilter.toLowerCase()) : true;
      return nameMatch && brandMatch;
    });
  }, [allProducts, currentProductIds, nameFilter, brandFilter]);

  const toggleProductSelection = (productId: string) => {
    setCurrentProductIds(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(productId)) {
        newSelection.delete(productId);
      } else {
        newSelection.add(productId);
      }
      return newSelection;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setName.trim()){
        setError("Set name cannot be empty.");
        return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await service.updateSet(set.id, setName, Array.from(currentProductIds));
      onSetUpdated();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to update set: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyles = "block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600";

  return (
     <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold">Edit Product Set</h2>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden">
            <div className="p-6 flex-grow overflow-y-auto space-y-6">
                <div>
                    <label htmlFor="setName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Set Name</label>
                    <input
                        type="text"
                        id="setName"
                        value={setName}
                        onChange={(e) => setSetName(e.target.value)}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600"
                    />
                </div>
                
                <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Products in this Set ({productsInSet.length})</p>
                    {productsInSet.length > 0 ? (
                        <ul className="mt-2 border border-slate-200 dark:border-slate-700 rounded-md divide-y divide-slate-200 dark:divide-slate-700 max-h-48 overflow-y-auto">
                            {productsInSet.map(product => (
                                <li key={product.id} className="pl-3 pr-4 py-2 flex items-center justify-between text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <div className="flex-1 w-0 truncate flex items-center gap-3">
                                        <img src={product.imageUrl} alt={product.name} className="h-8 w-8 rounded-md object-cover flex-shrink-0"/>
                                        <span className="font-medium truncate">{product.name}</span>
                                    </div>
                                    <button type="button" onClick={() => toggleProductSelection(product.id)} className="ml-4 text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300">
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="mt-2 text-center py-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-md">
                            <p className="text-sm text-slate-500">No products in this set.</p>
                        </div>
                    )}
                </div>

                <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Available Products to Add</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
                        <input type="text" placeholder="Filter by name..." value={nameFilter} onChange={e => setNameFilter(e.target.value)} className={inputStyles} />
                        <input type="text" placeholder="Filter by brand..." value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className={inputStyles} />
                    </div>
                    {availableProducts.length > 0 ? (
                        <ul className="border border-slate-200 dark:border-slate-700 rounded-md divide-y divide-slate-200 dark:divide-slate-700 max-h-48 overflow-y-auto">
                            {availableProducts.map(product => (
                                <li key={product.id} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <div className="w-0 flex-1 flex items-center">
                                        <input
                                            type="checkbox"
                                            id={`product-add-${product.id}`}
                                            checked={false} // This checkbox acts as an "Add" button
                                            onChange={() => toggleProductSelection(product.id)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded dark:bg-slate-700 dark:border-slate-600"
                                        />
                                        <label htmlFor={`product-add-${product.id}`} className="ml-3 flex-1 w-0 truncate cursor-pointer flex items-center gap-3">
                                            <img src={product.imageUrl} alt={product.name} className="h-8 w-8 rounded-md object-cover"/>
                                            <span className="font-medium">{product.name}</span>
                                        </label>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="mt-2 text-center py-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-md">
                            <p className="text-sm text-slate-500">No other products to add.</p>
                        </div>
                    )}
                </div>
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
