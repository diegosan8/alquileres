
import React from 'react';

const Modal = ({ children, title, onClose, size = 'xl', zIndex = 50 }) => {
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-2xl',
        xl: 'max-w-4xl',
        '4xl': 'max-w-7xl'
    };
    return (
        <div className={`fixed inset-0 flex items-center justify-center z-[${zIndex}]`}>
            <div className="fixed inset-0 bg-black bg-opacity-60" onClick={onClose} />
            <div className={`relative bg-gray-900 rounded-lg shadow-lg w-full ${sizeClasses[size] || sizeClasses.xl} mx-4`}>
                <div className="flex justify-between items-center border-b border-gray-700 px-6 py-4">
                    <h2 className="text-lg font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold">×</button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

export default Modal;
