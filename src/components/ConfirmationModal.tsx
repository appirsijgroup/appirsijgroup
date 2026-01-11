import React from 'react';
import { createPortal } from 'react-dom';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    confirmColorClass?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = "Ya, Konfirmasi", 
    confirmColorClass = "bg-red-600 hover:bg-red-500" 
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20">
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <div className="text-blue-200 mb-4">{message}</div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                    <button onClick={onConfirm} className={`px-4 py-2 rounded-lg font-semibold ${confirmColorClass}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmationModal;
