
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
                <label htmlFor="select-all-products" className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">Выбрать все ({products.length})</label>
            </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3 py-6">
            {products.map((product) => {
                const totalImages = 1 + (product.additionalImageUrls?.length || 0);
                return (
                    <div
                        key={product.id}
                        data-product-card="true"
                        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden transition-all duration-200 cursor-pointer flex flex-col justify-between border ${selectedProducts.has(product.id) ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' : 'border-gray-200 dark:border-gray-700 hover:shadow-md'}`}
                        onClick={() => handleSelectProduct(product.id)}
                    >
                        <div>
                            <div className="relative">
                                <div className="absolute top-2 left-2 z-10">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shadow-sm"
                                        checked={selectedProducts.has(product.id)}
                                        readOnly
                                    />
                                </div>
                                <div className="absolute top-2 right-2 z-10 flex gap-1">
                                    {product.videoUrl && (
                                        <div className="bg-black/60 p-1 rounded shadow-sm text-white" title="Видео">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm14.553 1.106A1 1 0 0016 8v4a1 1 0 00.553.894l2 1A1 1 0 0020 13V7a1 1 0 00-1.447-.894l-2-1z" />
                                            </svg>
                                        </div>
                                    )}
                                    {totalImages > 1 && (
                                        <div className="bg-blue-600/80 px-1.5 py-0.5 rounded shadow-sm text-[10px] font-bold text-white flex items-center gap-0.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                                            {totalImages}
                                        </div>
                                    )}
                                </div>
                                <div className="aspect-square w-full overflow-hidden bg-gray-50 dark:bg-gray-900">
                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 hover:scale-110" />
                                </div>
                            </div>
                            <div className="p-2 space-y-1">
                                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider truncate">{product.brand}</p>
                                <a href={product.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="font-semibold text-xs leading-tight text-gray-800 dark:text-gray-100 hover:underline block h-8 overflow-hidden" title={product.name}>{product.name}</a>
                                <div className="flex justify-between items-center pt-1 border-t border-gray-100 dark:border-gray-700 mt-1">
                                    <p className="text-sm font-black text-gray-900 dark:text-gray-100">{new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency }).format(product.price)}</p>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-gray-400">
                                    <p className="truncate mr-1">SKU: {product.retailer_id}</p>
                                    <p className="font-bold">{product.inventory} шт</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-2 pt-0">
                             <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(product);
                                }}
                                className="w-full py-1 text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-100 dark:border-blue-900/50 hover:bg-blue-600 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                Правка
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    </div>
  );
};
