import React from 'react';
import { Product } from '../types';

const StatusBadge: React.FC<{ status: string | null; rejectionReasons?: string[] }> = ({ status, rejectionReasons }) => {
    const statusText = status ? status.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN';
    const hasRejections = rejectionReasons && rejectionReasons.length > 0;
    
    let colorClasses = 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
    if (status === 'APPROVED') {
        colorClasses = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    } else if (status === 'REJECTED') {
        colorClasses = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    } else if (status === 'PENDING') {
         colorClasses = 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    }

    const badge = (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses}`}>
            {statusText}
        </span>
    );
    
    if (hasRejections) {
        return (
            <div className="relative group">
                {badge}
                <div className="absolute bottom-full right-0 mb-2 w-72 p-2 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
                    <h4 className="font-bold mb-1">Rejection Reasons:</h4>
                    <ul className="list-disc list-inside">
                        {rejectionReasons.map((reason, i) => <li key={i}>{reason}</li>)}
                    </ul>
                     <div className="absolute top-full right-3 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-slate-800"></div>
                </div>
            </div>
        );
    }

    return badge;
};


interface StatusListProps {
  products: Product[];
}

export const StatusList: React.FC<StatusListProps> = ({ products }) => {
  if (products.length === 0) {
    return (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg shadow">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No products found.</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Try adding a product first.</p>
        </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 shadow overflow-hidden sm:rounded-lg">
       <ul className="divide-y divide-slate-200 dark:divide-slate-700">
        {products.map((product) => (
          <li key={product.id} className="px-4 py-4 sm:px-6 flex items-center justify-between">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{product.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{product.brand}</p>
            </div>
            <div className="ml-4 flex-shrink-0">
                <StatusBadge status={product.reviewStatus} rejectionReasons={product.rejectionReasons} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
