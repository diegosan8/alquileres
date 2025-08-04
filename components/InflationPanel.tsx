
import React, { useState, useEffect } from 'react';

const InflationPanel = ({ inflationData, onSave }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [rates, setRates] = useState({});

    useEffect(() => {
        const initialRates = {};
        inflationData.forEach(rec => {
            initialRates[rec.id] = rec.rate;
        });
        setRates(initialRates);
    }, [inflationData]);

    const handleRateChange = (month, value) => {
        const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
        setRates(prev => ({ ...prev, [yearMonth]: parseFloat(value) || 0 }));
    }

    const handleSave = () => {
        const updatedData = Object.entries(rates).map(([id, rate]) => ({
            id,
            yearMonth: id,
            rate
        }));
        onSave(updatedData);
    };

    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    return (
        <div className="bg-gray-800 p-6 rounded-lg max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-white mb-4">Registro de Inflación Mensual</h3>
            <div className="flex items-center space-x-4 mb-6">
                <label className="text-gray-300">
                    Año:
                    <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="ml-2 bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white">
                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {months.map(month => {
                    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
                    const monthName = new Date(year, month - 1).toLocaleString('es-ES', { month: 'long' });
                    return (
                        <div key={month}>
                            <label className="block text-sm font-medium text-gray-300 capitalize">
                                {monthName}
                                <div className="relative mt-1">
                                    <input type="number" step="0.01" value={rates[yearMonth] || ''} onChange={e => handleRateChange(month, e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 pl-3 pr-8 text-white" />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">%</span>
                                    </div>
                                </div>
                            </label>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-end mt-6">
                <button onClick={handleSave} className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Guardar Inflación</button>
            </div>
        </div>
    );
};

export default InflationPanel;
