
import React, { useState, useMemo } from 'react';

const OwnersPanel = ({ owners, onSave }) => {
    const [localOwners, setLocalOwners] = useState(owners);

    const handlePercentageChange = (id, value) => {
        const newOwners = localOwners.map(o => o.id === id ? { ...o, percentage: parseFloat(value) || 0 } : o);
        setLocalOwners(newOwners);
    };

    const handleNameChange = (id, value) => {
        const newOwners = localOwners.map(o => o.id === id ? { ...o, name: value } : o);
        setLocalOwners(newOwners);
    };

    const totalPercentage = useMemo(() => localOwners.reduce((sum, o) => sum + o.percentage, 0), [localOwners]);

    const handleSave = () => {
        if (totalPercentage !== 100) {
            alert("El porcentaje total debe ser 100%.");
            return;
        }
        onSave(localOwners);
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-white mb-4">Gestionar Socios</h3>
            <div className="space-y-4">
                {localOwners.map(owner => (
                    <div key={owner.id} className="flex items-center space-x-4">
                        <input type="text" value={owner.name} onChange={e => handleNameChange(owner.id, e.target.value)} className="flex-grow bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white" />
                        <input type="number" value={owner.percentage} onChange={e => handlePercentageChange(owner.id, e.target.value)} className="w-24 bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white" />
                        <span className="text-gray-300">%</span>
                    </div>
                ))}
            </div>
            <div className="mt-6 border-t border-gray-700 pt-4">
                <div className={`flex justify-between items-center font-bold text-lg ${totalPercentage === 100 ? 'text-green-400' : 'text-red-400'}`}>
                    <span>Total:</span>
                    <span>{totalPercentage.toFixed(2)}%</span>
                </div>
            </div>
            <div className="flex justify-end mt-6">
                <button onClick={handleSave} className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={totalPercentage !== 100}>Guardar Cambios</button>
            </div>
        </div>
    );
};

export default OwnersPanel;
