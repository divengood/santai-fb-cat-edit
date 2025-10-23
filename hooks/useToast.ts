
import { useState, useCallback } from 'react';
import { ToastMessage, ToastType } from '../types';

export const useToast = () => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((message: string, type: ToastType) => {
        const id = Date.now();
        setToasts(prevToasts => [...prevToasts, { id, message, type }]);
        setTimeout(() => {
            removeToast(id);
        }, 5000);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, []);

    return { toasts, addToast, removeToast };
};