
import React from 'react';

const FirebaseErrorView = ({ error }) => (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-8 bg-red-900/30 rounded-lg">
        <h2 className="text-2xl font-bold text-red-400 mb-2">Error de Firebase</h2>
        <p className="text-white mb-4">Ocurrió un error al conectar con la base de datos.</p>
        {error && <pre className="bg-red-950 text-red-300 p-4 rounded text-xs max-w-xl overflow-x-auto">{String(error)}</pre>}
    </div>
);

export default FirebaseErrorView;
