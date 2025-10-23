
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, ProductSet, ToastType } from '../types';
import FacebookCatalogService from '../services/facebookService';
import { useToast } from '../hooks/useToast';
import { SetList } from './SetList';
import { Spinner } from './Spinner';
import { ToastContainer } from './ToastContainer';
import { EditSetModal } from './EditSetModal';
import { Logger } from '../services/loggingService';
import { BulkEditSetsModal } from './BulkEditSetsModal';
import { BulkCreateSetsModal } from './BulkCreateSetsModal';


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
    const [isBulkCreateModalOpen, setIsBulkCreateModalOpen] = useState(false);
    const [editingSet, setEditingSet] = useState<ProductSet | null>(null);
    const [nameFilter, setNameFilter] = useState('');
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
    
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

    const filteredSets = useMemo(() => {
        if (!nameFilter) {
            return sets;
        }
        return sets.filter(set => set.name.toLowerCase().includes(nameFilter.toLowerCase()));
    }, [sets, nameFilter]);

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
    
    const setsToEdit = useMemo(() => {
        return sets.filter(s => selectedSets.has(s.id));
    }, [sets, selectedSets]);

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
                        onClick={() => setIsBulkCreateModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Create Sets
                    </button>
                    <button
                        onClick={() => setIsBulkEditModalOpen(true)}
                        disabled={selectedSets.size === 0}
                        className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Edit Selected ({selectedSets.size})
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

            <div className="mb-4">
                <input
                    type="text"
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    placeholder="Filter by set name..."
                    className="block w-full max-w-sm px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700"
                />
            </div>
            
            <SetList
                sets={filteredSets}
                products={products}
                selectedSets={selectedSets}
                setSelectedSets={setSelectedSets}
                onEdit={setEditingSet}
            />

             {isBulkCreateModalOpen && (
                <BulkCreateSetsModal
                    onClose={() => setIsBulkCreateModalOpen(false)}
                    service={service}
                    allProducts={products}
                    onSetsCreated={(count) => {
                        fetchData();
                        addToast(`${count} product set(s) created successfully!`, ToastType.SUCCESS);
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
            {isBulkEditModalOpen && (
                <BulkEditSetsModal
                    onClose={() => setIsBulkEditModalOpen(false)}
                    service={service}
                    setsToEdit={setsToEdit}
                    allProducts={products}
                    onSetsUpdated={() => {
                        fetchData();
                        addToast(`${setsToEdit.length} set(s) updated successfully!`, ToastType.SUCCESS);
                    }}
                    logger={logger}
                />
            )}
        </div>
    );
};