import React from 'react';

export const Spinner = () => React.createElement('div', { className: "flex items-center justify-center h-full" },
    React.createElement('div', { className: "animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500" })
);
