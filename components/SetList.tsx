
import React, { useState } from 'react';
import { ProductSet, Product } from '../types';

interface SetListProps {
  sets: ProductSet[];
  products: Product[];
  selectedSets: Set<string>;
  setSelectedSets: React.Dispatch<React.SetStateAction<Set<string>>>;
  onEdit: (set: ProductSet) => void;
}

export const SetList: React.FC<SetListProps> = ({ sets, products, selectedSets, setSelectedSets, onEdit }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSelectSet = (setId: string) => {
    setSelectedSets(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(setId)) {
        newSelection.delete(setId);
      } else {
        newSelection.add(setId);
      }
      return newSelection;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedSets(new Set(sets.map(s => s.id)));
    } else {
      setSelectedSets(new Set());
    }
  };

  const copyToClipboard = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
  };

  const isAllSelected = sets.length > 0 && selectedSets.size === sets.length;
  const productsById = React.useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  return (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-3 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
            <input
            type="checkbox"
            id="select-all-sets"
            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700"
            checked={isAllSelected}
            onChange={handleSelectAll}
            />
            <label htmlFor="select-all-sets" className="ml-3 text-sm font-medium">Select All</label>
        </div>
      </div>
       {sets.length === 0 ? (
        <div className="text-center py-16">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No product sets found.</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Get started by creating a new set.</p>
        </div>
      ) : (
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {sets.map((set) => (
          <li key={set.id} className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
            <div className="flex items-start">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 mt-1 bg-gray-100 dark:bg-gray-700"
                checked={selectedSets.has(set.id)}
                onChange={() => handleSelectSet(set.id)}
              />
              <div className="ml-4 flex-1">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-none">{set.name}</p>
                        <div 
                            onClick={(e) => copyToClipboard(e, set.id)}
                            className="inline-flex items-center gap-1.5 mt-2 px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors group"
                            title="Click to copy ID"
                        >
                            <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 select-all">
                                ID: {set.id}
                            </span>
                            {copiedId === set.id ? (
                                <span className="text-[10px] text-green-600 dark:text-green-400 font-bold animate-pulse">Copied!</span>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                            )}
                        </div>
                    </div>
                    <button onClick={() => onEdit(set)} className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">Edit</button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">{set.productIds.length} products in this set.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                    {set.productIds.slice(0, 5).map(pid => {
                        const product = productsById.get(pid);
                        return product ? (
                            <img key={pid} src={product.imageUrl} alt={product.name} title={product.name} className="h-10 w-10 rounded-full object-cover ring-2 ring-white dark:ring-gray-800" />
                        ) : null;
                    })}
                    {set.productIds.length > 5 && (
                        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300 ring-2 ring-white dark:ring-gray-800">
                            +{set.productIds.length - 5}
                        </div>
                    )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      )}
    </div>
  );
};
