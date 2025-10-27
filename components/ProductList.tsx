import React from 'react';
import { Product } from '../types';

interface ProductListProps {
  products: Product[];
  selectedProducts: Set<string>;
  setSelectedProducts: React.Dispatch<React.SetStateAction<Set<string>>>;
  onEdit: (product: Product) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ products, selectedProducts, setSelectedProducts, onEdit }) => {

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(productId)) {
        newSelection.delete(productId);
      } else {
        newSelection.add(productId);
      }
      return newSelection;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedProducts(prevSelected => {
      const newSelection = new Set(prevSelected);
      const productIdsInView = products.map(p => p.id);
      if (e.target.checked) {
        // Add all visible products to selection
        productIdsInView.forEach(id => newSelection.add(id));
      } else {
        // Remove all visible products from selection
        productIdsInView.forEach(id => newSelection.delete(id));
      }
      return newSelection;
    });
  };

  const isAllSelected = products.length > 0 && products.every(p => selectedProducts.has(p.id));

  if (products.length === 0) {
    return (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg shadow">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No products found.</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Adjust your filters or add a new product.</p>
        </div>
    );
  }

  return (
    <div>
        <div className="px-4 py-3 sm:px-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-t-lg shadow">
            <div className="flex items-center">
                <input
                    type="checkbox"
                    id="select-all-products"
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-100 dark:bg-slate-700"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                />
                <label htmlFor="select-all-products" className="ml-3 text-sm font-medium">Select All ({products.length} shown)</label>
            </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 py-6">
            {products.map((product) => {
                return (
                    <div
                        key={product.id}
                        className={`bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden transition-all duration-200 cursor-pointer flex flex-col justify-between ${selectedProducts.has(product.id) ? 'ring-2 ring-blue-500' : 'ring-1 ring-slate-200 dark:ring-slate-700'}`}
                        onClick={() => handleSelectProduct(product.id)}
                    >
                        <div>
                            <div className="relative">
                                <div className="absolute top-2 left-2 z-10">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        checked={selectedProducts.has(product.id)}
                                        readOnly
                                    />
                                </div>
                                <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden">
                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                </div>
                            </div>
                            <div className="p-3">
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{product.brand}</p>
                                <a href={product.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="font-medium text-sm text-slate-900 dark:text-slate-100 hover:underline block truncate mt-0.5" title={product.name}>{product.name}</a>
                                <div className="flex justify-between items-center mt-2">
                                    <p className="text-base font-bold text-blue-600 dark:text-blue-400">{new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency }).format(product.price)}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Stock: {product.inventory}</p>
                                </div>
                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                    <p className="text-xs text-slate-400 dark:text-slate-500">SKU: {product.retailer_id}</p>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(product);
                                        }}
                                        className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                    >
                                        Edit
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    </div>
  );
};