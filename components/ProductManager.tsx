
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, ToastType } from '../types';
import FacebookCatalogService from '../services/facebookService';
import { useToast } from '../hooks/useToast';
import { ProductList } from './ProductList';
import { Spinner } from './Spinner';
import { BulkAddProductsModal } from './BulkAddProductsModal';
import { CreateSetModal } from './CreateSetModal';
import { ToastContainer } from './ToastContainer';
import { Logger } from '../services/loggingService';

interface ProductManagerProps {
    apiToken: string;
    catalogId: string;
    cloudinaryCloudName: string;
    cloudinaryUploadPreset: string;
    logger: Logger;
}

export const ProductManager: React.FC<ProductManagerProps> = ({ apiToken, catalogId, cloudinaryCloudName, cloudinaryUploadPreset, logger }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isCreateSetModalOpen, setIsCreateSetModalOpen] = useState(false);
    
    const { toasts, addToast, removeToast } = useToast();

    const service = useMemo(() => new FacebookCatalogService(apiToken, catalogId, logger), [apiToken, catalogId, logger]);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        setSelectedProducts(new Set());
        try {
            const fetchedProducts = await service.getProducts();
            setProducts(fetchedProducts);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addToast(`Failed to fetch products: ${errorMessage}`, ToastType.ERROR);
        } finally {
            setLoading(false);
        }
    }, [service, addToast]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleRefreshStatus = useCallback(async () => {
        const productIdsToRefresh = products.map(p => p.id);
        if (productIdsToRefresh.length === 0) {
            addToast('No products to refresh.', ToastType.INFO);
            return;
        }

        setIsRefreshing(true);
        try {
            const statusMap = await service.refreshProductsStatus(productIdsToRefresh);
            
            setProducts(currentProducts =>
                currentProducts.map(p => {
                    const newStatus = statusMap.get(p.id);
                    return newStatus ? { ...p, ...newStatus } : p;
                })
            );

            addToast('Product statuses refreshed.', ToastType.INFO);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addToast(`Failed to refresh statuses: ${errorMessage}`, ToastType.ERROR);
        } finally {
            setIsRefreshing(false);
        }
    }, [service, products, addToast]);

    const handleDeleteSelected = async () => {
        if (selectedProducts.size === 0) return;
        const productIds = Array.from(selectedProducts);
        
        try {
            await service.deleteProducts(productIds);
            setProducts(prev => prev.filter(p => !productIds.includes(p.id)));
            setSelectedProducts(new Set());
            addToast(`${productIds.length} product(s) deleted successfully.`, ToastType.SUCCESS);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addToast(`Failed to delete products: ${errorMessage}`, ToastType.ERROR);
        }
    };
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner />
            </div>
        );
    }

    return (
        <div>
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                 <h2 className="text-xl font-semibold">All Products ({products.length})</h2>
                <div className="flex items-center gap-2 flex-wrap">
                     <button
                        onClick={handleRefreshStatus}
                        disabled={isRefreshing}
                        className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isRefreshing && <Spinner size="sm" />}
                        Refresh Status
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Add Products
                    </button>
                    <button
                        onClick={() => setIsCreateSetModalOpen(true)}
                        className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Create Set ({selectedProducts.size})
                    </button>
                    <button
                        onClick={handleDeleteSelected}
                        disabled={selectedProducts.size === 0}
                         className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Delete Selected ({selectedProducts.size})
                    </button>
                </div>
            </div>
            
            <ProductList
                products={products}
                selectedProducts={selectedProducts}
                setSelectedProducts={setSelectedProducts}
            />

            {isAddModalOpen && (
                <BulkAddProductsModal
                    onClose={() => setIsAddModalOpen(false)}
                    service={service}
                    onProductsAdded={() => {
                        fetchProducts();
                        addToast('Products added successfully!', ToastType.SUCCESS);
                    }}
                    existingProducts={products}
                    cloudinaryCloudName={cloudinaryCloudName}
                    cloudinaryUploadPreset={cloudinaryUploadPreset}
                    logger={logger}
                />
            )}

            {isCreateSetModalOpen && (
                <CreateSetModal
                    onClose={() => setIsCreateSetModalOpen(false)}
                    service={service}
                    allProducts={products}
                    initiallySelectedProductIds={Array.from(selectedProducts)}
                    onSetCreated={() => {
                        setSelectedProducts(new Set());
                        addToast('Product set created successfully!', ToastType.SUCCESS);
                    }}
                    logger={logger}
                />
            )}
        </div>
    );
};