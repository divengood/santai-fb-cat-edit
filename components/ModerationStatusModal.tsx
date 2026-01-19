
import React, { useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import FacebookCatalogService from '../services/facebookService';
import { Spinner } from './Spinner';

interface ModerationStatusModalProps {
  onClose: () => void;
  service: FacebookCatalogService;
  products: Product[];
}

const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 uppercase">None</span>;

  const s = status.toLowerCase();

  // Handle various status strings from different FB API fields
  if (['approved', 'published', 'active', 'passed'].includes(s)) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 uppercase">Approved</span>;
  }
  
  if (['pending', 'pending_review', 'under_review', 'processing', 'review_pending'].includes(s)) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400 uppercase">Pending</span>;
  }

  if (['rejected', 'disapproved', 'failed', 'error', 'hidden', 'inactive'].includes(s)) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 uppercase">Rejected</span>;
  }

  if (['out_of_stock', 'discontinued'].includes(s)) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 uppercase">Out of Stock</span>;
  }

  // Fallback: show the actual string from API
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 uppercase truncate max-w-[100px]" title={status}>
      {status}
    </span>
  );
};

export const ModerationStatusModal: React.FC<ModerationStatusModalProps> = ({ onClose, service, products }) => {
  const [productStatuses, setProductStatuses] = useState<Map<string, string | undefined>>(new Map(products.map(p => [p.id, p.reviewStatus])));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const refreshStatuses = useCallback(async () => {
    if (products.length === 0) return;
    setIsRefreshing(true);
    setError('');
    try {
      const ids = products.map(p => p.id);
      const newStatuses = await service.refreshProductStatuses(ids);
      setProductStatuses(newStatuses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh statuses');
    } finally {
      setIsRefreshing(false);
    }
  }, [products, service]);

  // Refresh on mount if statuses are mostly missing
  useEffect(() => {
    const missing = products.filter(p => !p.reviewStatus).length;
    if (missing > products.length / 2) {
        refreshStatuses();
    }
  }, [refreshStatuses, products]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Moderation Status</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Reviewing {products.length} products</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={refreshStatuses} 
              disabled={isRefreshing}
              className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 disabled:opacity-50 transition-colors"
            >
              {isRefreshing ? <Spinner size="sm" /> : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Refresh
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4 space-y-2">
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg mb-4">{error}</div>}
          
          <div className="grid grid-cols-1 gap-2">
            {products.map(product => (
              <div key={product.id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                <img src={product.imageUrl} alt={product.name} className="h-12 w-12 rounded-lg object-cover shadow-sm flex-shrink-0" />
                <div className="flex-grow min-w-0">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{product.name}</h4>
                  <p className="text-[10px] text-gray-500 font-mono">SKU: {product.retailer_id}</p>
                </div>
                <div className="flex-shrink-0">
                  <StatusBadge status={productStatuses.get(product.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
