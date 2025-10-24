import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, ToastType } from '../types';
import FacebookCatalogService from '../services/facebookService';
import { useToast } from '../hooks/useToast';
import { Spinner } from './Spinner';
import { ToastContainer } from './ToastContainer';
import { Logger } from '../services/loggingService';
import { StatusList } from './StatusList';

interface StatusManagerProps {
    apiToken: string;
    catalogId: string;
    logger: Logger;
}

export const StatusManager: React.FC<StatusManagerProps> = ({ apiToken, catalogId, logger }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    const { toasts, addToast, removeToast } = useToast();

    const service = useMemo(() => new FacebookCatalogService(apiToken, catalogId, logger), [apiToken, catalogId, logger]);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
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

    const handleRefreshStatus = async () => {
        if (products.length === 0) {
            addToast("No products to refresh.", ToastType.INFO);
            return;
        }
        setIsRefreshing(true);
        try {
            const productIds = products.map(p => p.id);
            const updatedStatuses = await service.refreshProductsStatus(productIds);
            
            const statusesMap = new Map(updatedStatuses.map(s => [s.id, s]));

            setProducts(prevProducts =>
                prevProducts.map(product => {
                    const newStatus = statusesMap.get(product.id);
                    // FIX: Replaced ternary with an if-statement for clearer type narrowing before spreading.
                    if (newStatus) {
                        return { ...product, ...newStatus };
                    }
                    return product;
                })
            );
            addToast(`Statuses for ${updatedStatuses.length} products updated.`, ToastType.SUCCESS);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addToast(`Failed to refresh statuses: ${errorMessage}`, ToastType.ERROR);
        } finally {
            setIsRefreshing(false);
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
                <h2 className="text-xl font-semibold">Product Moderation Status ({products.length})</h2>
                <button
                    onClick={handleRefreshStatus}
                    disabled={isRefreshing}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2 disabled:bg-blue-400"
                >
                    {isRefreshing && <Spinner size="sm" />}
                    Refresh Status
                </button>
            </div>

            <StatusList products={products} />
        </div>
    );
};