import React from 'react';
import { ProductSet, Product } from '../types';

interface SetListProps {
  sets: ProductSet[];
  products: Product[];
  selectedSets: Set<string>;
  setSelectedSets: React.Dispatch<React.SetStateAction<Set<string>>>;
  onEdit: (set: ProductSet) => void;
}

export const SetList: React.FC<SetListProps> = ({ sets, products, selectedSets, setSelectedSets, onEdit }) => {

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
                <div className="flex justify-between items-center">
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{set.name}</p>
                    <button onClick={() => onEdit(set)} className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">Edit</button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{set.productIds.length} products in this set.</p>
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