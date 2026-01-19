
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, ToastType } from '../types';
import FacebookCatalogService from '../services/facebookService';
import { useToast } from '../hooks/useToast';
import { ProductList } from './ProductList';
import { Spinner } from './Spinner';
import { BulkAddProductsModal } from './BulkAddProductsModal';
import { ToastContainer } from './ToastContainer';
import { Logger } from '../services/loggingService';
import { EditProductModal } from './EditProductModal';

const COIN_SOUND_URL = 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_165a995381.mp3?filename=coins-100142.mp3';

interface ProductManagerProps {
    apiToken: string;
    catalogId: string;
    cloudinaryCloudName: string;
    cloudinaryUploadPreset: string;
    logger: Logger;
    playSound: (soundUrl: string) => void;
}

export const ProductManager: React.FC<ProductManagerProps> = ({ apiToken, catalogId, cloudinaryCloudName, cloudinaryUploadPreset, logger, playSound }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isCreatingSets, setIsCreatingSets] = useState(false);
    const [nameFilter, setNameFilter] = useState('');
    const [brandFilter, setBrandFilter] = useState('');
    
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

    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const nameMatch = nameFilter ? product.name.toLowerCase().includes(nameFilter.toLowerCase()) : true;
            const brandMatch = brandFilter ? product.brand.toLowerCase().includes(brandFilter.toLowerCase()) : true;
            return nameMatch && brandMatch;
        });
    }, [products, nameFilter, brandFilter]);

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

    const handleCreateSetsFromSelection = async () => {
        if (selectedProducts.size === 0) {
            addToast('Please select products to create sets from.', ToastType.INFO);
            return;
        }
    
        setIsCreatingSets(true);
        try {
            const selectedProductObjects = products.filter(p => selectedProducts.has(p.id));
    
            const creationPromises = selectedProductObjects.map(product => {
                const setName = product.brand ? product.brand.trim() : '';
                if (!setName) {
                    logger.warn(`Skipping product "${product.name}" (ID: ${product.id}) because its brand is empty.`);
                    return Promise.resolve({ status: 'skipped', product });
                }
                return service.createSet(setName, [product.id])
                    .then(result => ({ status: 'fulfilled', value: result, product }))
                    .catch(error => ({ status: 'rejected', reason: error, product }));
            });
    
            const results = await Promise.all(creationPromises);
            
            const successfulCreations = results.filter(r => r.status === 'fulfilled').length;
            const failedCreations = results.filter(r => r.status === 'rejected').length;
            const skippedCreations = results.filter(r => r.status === 'skipped').length;
            
            if (successfulCreations > 0) {
                addToast(`${successfulCreations} product set(s) created successfully.`, ToastType.SUCCESS);
            }
            if (failedCreations > 0) {
                addToast(`${failedCreations} set(s) failed to create. Check logs for details.`, ToastType.ERROR);
                results.filter((r): r is { status: 'rejected'; reason: any; product: Product } => r.status === 'rejected').forEach(r => {
                    const reason = r.reason instanceof Error ? r.reason.message : String(r.reason);
                    logger.error(`Failed to create set for product "${r.product.name}": ${reason}`);
                });
            }
            if (skippedCreations > 0) {
                addToast(`${skippedCreations} product(s) were skipped due to an empty brand name.`, ToastType.INFO);
            }
    
            if (successfulCreations > 0) {
                setSelectedProducts(new Set());
            }
    
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addToast(`An unexpected error occurred while creating sets: ${errorMessage}`, ToastType.ERROR);
        } finally {
            setIsCreatingSets(false);
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
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Add Products
                    </button>
                    <button
                        onClick={handleCreateSetsFromSelection}
                        disabled={selectedProducts.size === 0 || isCreatingSets}
                        className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
                    >
                        {isCreatingSets && <Spinner size="sm" />}
                        Create Sets ({selectedProducts.size})
                    </button>
                    <button
                        onClick={handleDeleteSelected}
                        disabled={selectedProducts.size === 0}
                         className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Delete Selected ({selectedProducts.size})
                    </button>
                </div>
            </div>
            
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                    type="text"
                    placeholder="Filter by product name..."
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700"
                />
                <input
                    type="text"
                    placeholder="Filter by brand..."
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700"
                />
            </div>

            <ProductList
                products={filteredProducts}
                selectedProducts={selectedProducts}
                setSelectedProducts={setSelectedProducts}
                onEdit={(product) => setEditingProduct(product)}
            />

            {isAddModalOpen && (
                <BulkAddProductsModal
                    onClose={() => setIsAddModalOpen(false)}
                    service={service}
                    onProductsAdded={() => {
                        fetchProducts();
                        addToast('Products added successfully!', ToastType.SUCCESS);
                        playSound(COIN_SOUND_URL);
                    }}
                    existingProducts={products}
                    cloudinaryCloudName={cloudinaryCloudName}
                    cloudinaryUploadPreset={cloudinaryUploadPreset}
                    logger={logger}
                />
            )}

            {editingProduct && (
                <EditProductModal
                    onClose={() => setEditingProduct(null)}
                    service={service}
                    product={editingProduct}
                    onProductUpdated={() => {
                        fetchProducts();
                        addToast(`Product "${editingProduct.name}" updated successfully!`, ToastType.SUCCESS);
                    }}
                    cloudinaryCloudName={cloudinaryCloudName}
                    cloudinaryUploadPreset={cloudinaryUploadPreset}
                    logger={logger}
                />
            )}
        </div>
    );
};
