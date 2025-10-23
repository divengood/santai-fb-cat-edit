import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import FacebookCatalogService from '../services/facebookService';
import { Spinner } from './Spinner';
import { Logger } from '../services/loggingService';

interface BulkCreateSetsModalProps {
  onClose: () => void;
  service: FacebookCatalogService;
  allProducts: Product[];
  onSetsCreated: (count: number) => void;
  logger?: Logger;
}

interface SetCreatorState {
    id: number;
    name: string;
    selectedProductIds: Set<string>;
    nameFilter: string;
    brandFilter: string;
}

let nextId = 0;

const createNewSetState = (): SetCreatorState => ({
    id: nextId++,
    name: '',
    selectedProductIds: new Set(),
    nameFilter: '',
    brandFilter: ''
});

const SetCreator: React.FC<{
    state: SetCreatorState;
    allProducts: Product[];
    onUpdate: (newState: SetCreatorState) => void;
    onRemove: () => void;
    onClone: () => void;
    isOnlyOne: boolean;
}> = ({ state, allProducts, onUpdate, onRemove, onClone, isOnlyOne }) => {

    const filteredProducts = useMemo(() => {
        return allProducts.filter(product => {
            const nameMatch = state.nameFilter ? product.name.toLowerCase().includes(state.nameFilter.toLowerCase()) : true;
            const brandMatch = state.brandFilter ? product.brand.toLowerCase().includes(state.brandFilter.toLowerCase()) : true;
            return nameMatch && brandMatch;
        });
    }, [allProducts, state.nameFilter, state.brandFilter]);

    const handleProductSelection = (productId: string) => {
        const newSelectedIds = new Set(state.selectedProductIds);
        if (newSelectedIds.has(productId)) {
            newSelectedIds.delete(productId);
        } else {
            newSelectedIds.add(productId);
        }
        onUpdate({ ...state, selectedProductIds: newSelectedIds });
    };

    const inputStyles = "block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600";

    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700 p-4 rounded-md relative space-y-4">
            <div className="absolute top-3 right-3 flex items-center gap-2">
                <button type="button" onClick={onClone} title="Clone Set" className="text-slate-400 hover:text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
                <button type="button" onClick={onRemove} title="Remove Set" className="text-slate-400 hover:text-red-500 disabled:text-slate-300 dark:disabled:text-slate-500" disabled={isOnlyOne}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
            
            <input
                type="text"
                placeholder="New Set Name"
                value={state.name}
                onChange={(e) => onUpdate({ ...state, name: e.target.value })}
                required
                className={inputStyles}
            />

            <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Select Products ({state.selectedProductIds.size})</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
                    <input type="text" placeholder="Filter by name..." value={state.nameFilter} onChange={e => onUpdate({ ...state, nameFilter: e.target.value })} className={inputStyles} />
                    <input type="text" placeholder="Filter by brand..." value={state.brandFilter} onChange={e => onUpdate({ ...state, brandFilter: e.target.value })} className={inputStyles} />
                </div>
                {allProducts.length > 0 ? (
                    <ul className="border border-slate-200 dark:border-slate-700 rounded-md divide-y divide-slate-200 dark:divide-slate-700 max-h-40 overflow-y-auto">
                        {filteredProducts.map(product => (
                            <li key={product.id} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <div className="w-0 flex-1 flex items-center">
                                    <input type="checkbox" id={`product-bulk-create-${state.id}-${product.id}`} checked={state.selectedProductIds.has(product.id)} onChange={() => handleProductSelection(product.id)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded dark:bg-slate-700 dark:border-slate-600" />
                                    <label htmlFor={`product-bulk-create-${state.id}-${product.id}`} className="ml-3 flex-1 w-0 truncate cursor-pointer flex items-center gap-3">
                                        <img src={product.imageUrl} alt={product.name} className="h-8 w-8 rounded-md object-cover"/>
                                        <span className="font-medium">{product.name}</span>
                                    </label>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No products available.</p>}
            </div>
        </div>
    );
};

export const BulkCreateSetsModal: React.FC<BulkCreateSetsModalProps> = ({ onClose, service, allProducts, onSetsCreated, logger }) => {
  const [setCreators, setSetCreators] = useState<SetCreatorState[]>([createNewSetState()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const updateCreator = (id: number, newState: SetCreatorState) => {
    setSetCreators(current => current.map(c => c.id === id ? newState : c));
  };
  
  const addCreator = () => {
    setSetCreators(current => [...current, createNewSetState()]);
  };
  
  const removeCreator = (id: number) => {
    if (setCreators.length > 1) {
        setSetCreators(current => current.filter(c => c.id !== id));
    }
  };
  
  const cloneCreator = (id: number) => {
    const creatorToClone = setCreators.find(c => c.id === id);
    if (creatorToClone) {
        const newCreator = { ...creatorToClone, id: nextId++, name: `${creatorToClone.name} (Copy)` };
        const index = setCreators.findIndex(c => c.id === id);
        const newCreators = [...setCreators];
        newCreators.splice(index + 1, 0, newCreator);
        setSetCreators(newCreators);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validCreators = setCreators.filter(c => c.name.trim());
    
    if (validCreators.length === 0) {
        setError("Please define at least one set with a name.");
        return;
    }

    setError('');
    setIsSubmitting(true);
    logger?.info(`Starting bulk creation of ${validCreators.length} set(s)...`);

    try {
        const createPromises = validCreators.map(creator => {
            logger?.info(`Creating set "${creator.name}" with ${creator.selectedProductIds.size} products.`);
            return service.createSet(creator.name, Array.from(creator.selectedProductIds));
        });
        
        await Promise.all(createPromises);
        onSetsCreated(validCreators.length);
        onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to bulk create sets: ${errorMessage}`);
      logger?.error("Bulk set creation failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold">Bulk Create Sets</h2>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
          <div className="p-6 space-y-6">
            {setCreators.map((creator, index) => (
              <SetCreator 
                key={creator.id}
                state={creator}
                allProducts={allProducts}
                onUpdate={(newState) => updateCreator(creator.id, newState)}
                onRemove={() => removeCreator(creator.id)}
                onClone={() => cloneCreator(creator.id)}
                isOnlyOne={setCreators.length === 1}
              />
            ))}
            <button type="button" onClick={addCreator} className="text-blue-600 dark:text-blue-400 font-medium text-sm hover:text-blue-500">
              + Add another set
            </button>
          </div>
           {error && <p className="text-sm text-red-500 text-center px-6 pb-4">{error}</p>}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 border-t dark:border-slate-700 flex justify-end gap-3 sticky bottom-0">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-600 text-sm font-medium bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-slate-400 flex items-center gap-2">
              {isSubmitting && <Spinner size="sm" />}
              {isSubmitting ? 'Creating...' : `Create ${setCreators.filter(c => c.name.trim()).length} Sets`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
