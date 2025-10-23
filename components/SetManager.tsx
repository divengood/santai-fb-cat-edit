import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, ProductSet, ToastType } from '../types';
import FacebookCatalogService from '../services/facebookService';
import { useToast } from '../hooks/useToast';
import { SetList } from './SetList';
import { Spinner } from './Spinner';
import { ToastContainer } from './ToastContainer';
import { CreateSetModal } from './CreateSetModal';
import { EditSetModal } from './EditSetModal';
import { Logger } from '../services/loggingService';

interface SetManagerProps {
    apiToken: string;
    catalogId: string;
    logger: Logger;
}

export const SetManager: React.FC<SetManagerProps> = ({ apiToken, catalogId, logger }) => {
    const [sets, setSets] = useState<ProductSet[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSets, setSelectedSets] = useState<Set<string>>(new Set());
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingSet, setEditingSet] = useState<ProductSet | null>(null);
    
    const { toasts, addToast, removeToast } = useToast();
    const service = useMemo(() => new FacebookCatalogService(apiToken, catalogId, logger), [apiToken, catalogId, logger]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setSelectedSets(new Set());
        try {
            const fetchedProducts = await service.getProducts();
            setProducts(fetchedProducts);
            const fetchedSets = await service.getSets();
            setSets(fetchedSets);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addToast(`Failed to fetch data: ${errorMessage}`, ToastType.ERROR);
        } finally {
            setLoading(false);
        }
    }, [service, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDeleteSelected = async () => {
        if (selectedSets.size === 0) return;
        const setIds = Array.from(selectedSets);
        
        try {
            await service.deleteSets(setIds);
            setSets(prev => prev.filter(s => !setIds.includes(s.id)));
            setSelectedSets(new Set());
            addToast(`${setIds.length} set(s) deleted successfully.`, ToastType.SUCCESS);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addToast(`Failed to delete sets: ${errorMessage}`, ToastType.ERROR);
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
                 <h2 className="text-xl font-semibold">All Product Sets ({sets.length})</h2>
                <div className="flex items-center gap-2 flex-wrap">
                     <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Create Set
                    </button>
                    <button
                        onClick={handleDeleteSelected}
                        disabled={selectedSets.size === 0}
                        className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Delete Selected ({selectedSets.size})
                    </button>
                </div>
            </div>
            
            <SetList
                sets={sets}
                products={products}
                selectedSets={selectedSets}
                setSelectedSets={setSelectedSets}
                onEdit={setEditingSet}
            />

            {isCreateModalOpen && (
                <CreateSetModal
                    onClose={() => setIsCreateModalOpen(false)}
                    service={service}
                    allProducts={products}
                    initiallySelectedProductIds={[]}
                    onSetCreated={() => {
                        fetchData();
                        addToast('Product set created successfully!', ToastType.SUCCESS);
                    }}
                    logger={logger}
                />
            )}
             {editingSet && (
                <EditSetModal
                    onClose={() => setEditingSet(null)}
                    service={service}
                    set={editingSet}
                    allProducts={products}
                    onSetUpdated={() => {
                        fetchData();
                        addToast(`Set "${editingSet.name}" updated successfully!`, ToastType.SUCCESS);
                    }}
                    logger={logger}
                />
            )}
        </div>
    );
};