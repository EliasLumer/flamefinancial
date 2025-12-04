'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

type ToastType = 'warning' | 'success' | 'info' | 'error';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast = { ...toast, id };
        
        setToasts(prev => [...prev, newToast]);
        
        // Auto-dismiss after duration (default 7 seconds)
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, toast.duration || 7000);
    }, []);

    const dismissToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'warning':
            case 'error':
                return <AlertTriangle className="h-5 w-5" />;
            case 'success':
                return <CheckCircle className="h-5 w-5" />;
            case 'info':
                return <Info className="h-5 w-5" />;
        }
    };

    const getStyles = (type: ToastType) => {
        switch (type) {
            case 'warning':
                return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
            case 'error':
                return 'border-red-500/30 bg-red-500/10 text-red-200';
            case 'success':
                return 'border-green-500/30 bg-green-500/10 text-green-200';
            case 'info':
                return 'border-blue-500/30 bg-blue-500/10 text-blue-200';
        }
    };

    const getIconColor = (type: ToastType) => {
        switch (type) {
            case 'warning':
                return 'text-amber-400';
            case 'error':
                return 'text-red-400';
            case 'success':
                return 'text-green-400';
            case 'info':
                return 'text-blue-400';
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            
            {/* Toast Container - Centered */}
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col gap-2 max-w-md w-full mx-4">
                    {toasts.map((toast) => (
                        <div
                            key={toast.id}
                            className={`
                                flex items-start gap-3 p-4 rounded-lg border backdrop-blur-md
                                shadow-2xl animate-in zoom-in-95 fade-in duration-200 pointer-events-auto
                                ${getStyles(toast.type)}
                            `}
                        >
                        <div className={`shrink-0 mt-0.5 ${getIconColor(toast.type)}`}>
                            {getIcon(toast.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{toast.title}</p>
                            {toast.message && (
                                <p className="text-xs mt-1 opacity-80 whitespace-pre-line">{toast.message}</p>
                            )}
                        </div>
                            <button 
                                onClick={() => dismissToast(toast.id)}
                                className="shrink-0 text-zinc-400 hover:text-zinc-200 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </ToastContext.Provider>
    );
};

