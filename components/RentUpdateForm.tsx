import React, { useState } from 'react';

const RentUpdateForm = ({ onSave, onClose, currentRent, currentTax }) => {
    const [newRent, setNewRent] = useState(currentRent);
    const [newTax, setNewTax] = useState(currentTax);
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ date, rent: parseFloat(newRent), tax: parseFloat(newTax) });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-300">
                    Fecha de entrada en vigencia
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                </label>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300">
                    Nuevo Alquiler Mensual ($)
                    <input type="number" value={newRent} onChange={e => setNewRent(e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                </label>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300">
                    Nuevo TSG Mensual ($)
                    <input type="number" value={newTax} onChange={e => setNewTax(e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                </label>
            </div>
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Guardar Actualización</button>
            </div>
        </form>
    );
};

export default RentUpdateForm;
