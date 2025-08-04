
import React, { useState, useEffect } from 'react';

const PaymentForm = ({ onSave, onClose, unpaidCharges, initialData }) => {
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [selectedChargeIds, setSelectedChargeIds] = useState(initialData?.allocatedChargeIds || []);
    const [amount, setAmount] = useState((initialData?.amount || 0).toFixed(2));

    useEffect(() => {
        if (!initialData) {
            const totalSelectedAmount = unpaidCharges
                .filter(c => selectedChargeIds.includes(c.id))
                .reduce((sum, c) => sum + c.amount, 0);
            setAmount(totalSelectedAmount.toFixed(2));
        }
    }, [selectedChargeIds, unpaidCharges, initialData]);

    const handleCheckboxChange = (chargeId) => {
        setSelectedChargeIds((prev) =>
            prev.includes(chargeId)
                ? prev.filter(id => id !== chargeId)
                : [...prev, chargeId]
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const paymentAmount = parseFloat(amount);
        if (!date) {
            alert("Por favor, seleccione una fecha de pago.");
            return;
        }
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            alert("Por favor, ingrese un monto válido y mayor a cero.");
            return;
        }

        onSave({
            id: initialData?.id || `pay_${new Date().getTime()}`,
            date,
            amount: paymentAmount,
            notes,
            allocatedChargeIds: selectedChargeIds,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-300">
                    Selecciona cargos a pagar:
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto mt-2">
                    {unpaidCharges && unpaidCharges.length > 0 ? unpaidCharges.map(charge => (
                        <label key={charge.id} className="flex items-center justify-between p-2 bg-gray-700 rounded-md cursor-pointer hover:bg-gray-600">
                            <div className="flex items-center">
                                <input type="checkbox" checked={selectedChargeIds.includes(charge.id)} onChange={() => handleCheckboxChange(charge.id)} className="h-4 w-4 rounded border-gray-500 bg-gray-800 text-indigo-600 focus:ring-indigo-500" />
                                <span className="ml-3 text-white">{charge.date} - {charge.description}</span>
                            </div>
                            <span className="font-mono text-amber-300">{charge.amount?.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })}</span>
                        </label>
                    )) : <p className="text-gray-400 text-center py-4">No hay cargos pendientes.</p>}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-300">
                        Monto Total Pagado ($)
                        <input type="number" step="0.01" name="paymentAmount" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white" required />
                    </label>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">
                        Fecha de Pago
                        <input type="date" name="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white" required />
                    </label>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300">
                    Notas Adicionales
                    <textarea name="notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white" />
                </label>
            </div>
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Guardar Pago</button>
            </div>
        </form>
    );
};

export default PaymentForm;
