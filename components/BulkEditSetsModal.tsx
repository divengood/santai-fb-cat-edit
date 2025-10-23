import React, { useState, useMemo, useEffect } from 'react';
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

interface SetEditState {
    id: string;
    name: string;
    productIds: Set<string>;
    nameFilter: string;
    brandFilter: string;
}

// Component for editing a single set within the bulk modal
const SetEditor: React.FC<{
    state: SetEditState;
    allProducts: Product[];
    onUpdate: (newState: SetEditState) => void;
}> = ({ state, allProducts, onUpdate }) => {
    
    const productsInSet = useMemo(() => {
        return allProducts.filter(p => state.productIds.has(p.id));
    }, [allProducts, state.productIds]);
    
    const availableProducts = useMemo(() => {
        return allProducts.filter(product => 
            !state.productIds.has(product.id) &&
            (!state.nameFilter || product.name.toLowerCase().includes(state.nameFilter.toLowerCase())) &&
            (!state.brandFilter || product.brand.toLowerCase().includes(state.brandFilter.toLowerCase()))
        );
    }, [allProducts, state.productIds, state.nameFilter, state.brandFilter]);

    const handleNameChange = (newName: string) => {
        onUpdate({ ...state, name: newName });
    };

    const toggleProductSelection = (productId: string) => {
        const newProductIds = new Set(state.productIds);
        if (newProductIds.has(productId)) {
            newProductIds.delete(productId);
        } else {
            newProductIds.add(productId);
        }
        onUpdate({ ...state, productIds: newProductIds });
    };

    const inputStyles = "block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600";

    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700 p-4 rounded-md space-y-4">
            <input
                type="text"
                value={state.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className={`${inputStyles} font-semibold`}
            />
            <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Products in this Set ({productsInSet.length})</p>
                {productsInSet.length > 0 ? (
                    <ul className="mt-2 border border-slate-200 dark:border-slate-700 rounded-md divide-y divide-slate-200 dark:divide-slate-700 max-h-40 overflow-y-auto">
                        {productsInSet.map(product => (
                            <li key={product.id} className="pl-3 pr-4 py-2 flex items-center justify-between text-sm">
                                <span className="font-medium truncate">{product.name}</span>
                                <button type="button" onClick={() => toggleProductSelection(product.id)} className="ml-4 text-sm font-medium text-red-600 hover:text-red-500">Remove</button>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-xs text-center py-4 text-slate-500 dark:text-slate-400 mt-1">No products in this set.</p>}
            </div>
             <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Available Products to Add</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
                    <input type="text" placeholder="Filter by name..." value={state.nameFilter} onChange={e => onUpdate({...state, nameFilter: e.target.value})} className={inputStyles} />
                    <input type="text" placeholder="Filter by brand..." value={state.brandFilter} onChange={e => onUpdate({...state, brandFilter: e.target.value})} className={inputStyles} />
                </div>
                {availableProducts.length > 0 ? (
                    <ul className="border border-slate-200 dark:border-slate-700 rounded-md divide-y divide-slate-200 dark:divide-slate-700 max-h-40 overflow-y-auto">
                        {availableProducts.map(product => (
                            <li key={product.id} className="pl-3 pr-4 py-3 flex items-center">
                                <input type="checkbox" id={`bulk-edit-${state.id}-${product.id}`} checked={false} onChange={() => toggleProductSelection(product.id)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded" />
                                <label htmlFor={`bulk-edit-${state.id}-${product.id}`} className="ml-3 flex-1 w-0 truncate cursor-pointer">{product.name}</label>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-xs text-center py-4 text-slate-500 dark:text-slate-400 mt-1">No other products to add.</p>}
            </div>
        </div>
    );
};

export const BulkEditSetsModal: React.FC<BulkEditSetsModalProps> = ({ onClose, service, setsToEdit, allProducts, onSetsUpdated, logger }) => {
  const [editStates, setEditStates] = useState<SetEditState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setEditStates(setsToEdit.map(set => ({
        id: set.id,
        name: set.name,
        productIds: new Set(set.productIds),
        nameFilter: '',
        brandFilter: '',
    })));
  }, [setsToEdit]);

  const updateSetState = (id: string, newState: SetEditState) => {
    setEditStates(current => current.map(s => s.id === id ? newState : s));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    logger?.info(`Starting bulk update for ${editStates.length} set(s)...`);

    try {
        const updatePromises = editStates.map(state => {
            logger?.info(`Updating set "${state.name}" with ${state.productIds.size} products.`);
            return service.updateSet(state.id, state.name, Array.from(state.productIds));
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
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold">Bulk Edit Sets ({setsToEdit.length})</h2>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden">
            <div className="p-6 flex-grow overflow-y-auto space-y-6">
                {editStates.map(state => (
                    <SetEditor
                        key={state.id}
                        state={state}
                        allProducts={allProducts}
                        onUpdate={(newState) => updateSetState(state.id, newState)}
                    />
                ))}
            </div>
             {error && <p className="text-sm text-red-500 text-center px-6 pb-4">{error}</p>}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 border-t dark:border-slate-700 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-600 text-sm font-medium bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-slate-400 flex items-center gap-2">
                    {isSubmitting && <Spinner size="sm" />}
                    {isSubmitting ? 'Saving...' : 'Save All Changes'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};