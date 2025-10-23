import React from 'react';
import { ToastMessage, ToastType } from '../types';

interface ToastProps {
  message: ToastMessage;
  onDismiss: () => void;
}

const toastStyles = {
    [ToastType.SUCCESS]: {
        bg: 'bg-green-50 dark:bg-green-900/50',
        border: 'border-green-400 dark:border-green-600',
        icon: (
            <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
        ),
        text: 'text-green-800 dark:text-green-200',
        ring: 'focus:ring-green-500 focus:ring-offset-green-50 dark:focus:ring-offset-green-900/50',
    },
    [ToastType.ERROR]: {
        bg: 'bg-red-50 dark:bg-red-900/50',
        border: 'border-red-400 dark:border-red-600',
        icon: (
             <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
        ),
        text: 'text-red-800 dark:text-red-200',
        ring: 'focus:ring-red-500 focus:ring-offset-red-50 dark:focus:ring-offset-red-900/50',
    },
     [ToastType.INFO]: {
        bg: 'bg-blue-50 dark:bg-blue-900/50',
        border: 'border-blue-400 dark:border-blue-600',
        icon: (
            <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
        ),
        text: 'text-blue-800 dark:text-blue-200',
        ring: 'focus:ring-blue-500 focus:ring-offset-blue-50 dark:focus:ring-offset-blue-900/50',
    },
};

export const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
    const styles = toastStyles[message.type];

    return (
        <div className={`p-4 rounded-lg shadow-lg border-l-4 ${styles.bg} ${styles.border} flex items-start`}>
            <div className="flex-shrink-0">{styles.icon}</div>
            <div className="ml-3 w-0 flex-1 pt-0.5">
                <p className={`text-sm font-medium ${styles.text}`}>{message.message}</p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
                <button type="button" onClick={onDismiss} className={`inline-flex rounded-md p-1.5 ${styles.text} hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.ring}`}>
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                </button>
            </div>
        </div>
    );
};