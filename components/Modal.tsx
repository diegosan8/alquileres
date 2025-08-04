import React from 'react';
import { XIcon } from './Icons.js';

export const Modal = ({ children, title, onClose, size = 'xl', zIndex = 50 }) => {
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-2xl',
        xl: 'max-w-4xl',
        '4xl': 'max-w-7xl'
    };
    return React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center p-4", style: { zIndex } },
        React.createElement('div', { className: `bg-gray-800 rounded-lg shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col` },
            React.createElement('div', { className: "flex justify-between items-center p-4 border-b border-gray-700" },
                React.createElement('h3', { className: "text-xl font-semibold text-white" }, title),
                React.createElement('button', { onClick: onClose, className: "text-gray-400 hover:text-white" },
                    React.createElement(XIcon, { className: "h-6 w-6" })
                )
            ),
            React.createElement('div', { className: "p-6 overflow-y-auto" },
                children
            )
        )
    );
};
