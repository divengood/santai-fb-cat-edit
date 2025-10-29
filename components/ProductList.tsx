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
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No products found.</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Adjust your filters or add a new product.</p>
        </div>
    );
  }

  return (
    <div>
        <div className="px-4 py-3 sm:px-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-lg">
            <div className="flex items-center">
                <input
                    type="checkbox"
                    id="select-all-products"
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                />
                <label htmlFor="select-all-products" className="ml-3 text-sm font-medium">Select All ({products.length} shown)</label>
            </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3 py-6">
            {products.map((product) => {
                return (
                    <div
                        key={product.id}
                        data-product-card="true"
                        className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-all duration-200 cursor-pointer flex flex-col justify-between border ${selectedProducts.has(product.id) ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700'}`}
                        onClick={() => handleSelectProduct(product.id)}
                    >
                        <div>
                            <div className="relative">
                                <div className="absolute top-2 left-2 z-10">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={selectedProducts.has(product.id)}
                                        readOnly
                                    />
                                </div>
                                {product.videoUrl && (
                                    <div className="absolute top-2 right-2 z-10 bg-black/50 p-1 rounded-full text-white" title="Video available">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm14.553 1.106A1 1 0 0016 8v4a1 1 0 00.553.894l2 1A1 1 0 0020 13V7a1 1 0 00-1.447-.894l-2-1z" />
                                        </svg>
                                    </div>
                                )}
                                <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden">
                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                </div>
                            </div>
                            <div className="p-2 space-y-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{product.brand}</p>
                                <a href={product.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="font-semibold text-sm leading-tight text-gray-800 dark:text-gray-100 hover:underline block" title={product.name}>{product.name}</a>
                                <div className="flex justify-between items-center pt-1">
                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-200">{new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency }).format(product.price)}</p>
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                                    <p>SKU: {product.retailer_id}</p>
                                    <p>Stock: {product.inventory}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-2 pt-1">
                             <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(product);
                                }}
                                className="w-full px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                            >
                                Edit
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    </div>
  );
};