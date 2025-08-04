import React, { useState, useEffect } from 'react';
import { formatDate, formatCurrency } from '../utils.js';
import type { Payment, Charge } from '../types.js';

export const PaymentForm = ({ onSave, onClose, unpaidCharges, initialData }: { onSave: (payment: Payment) => void, onClose: () => void, unpaidCharges: Charge[], initialData: Payment | null }) => {
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [selectedChargeIds, setSelectedChargeIds] = useState(initialData?.allocatedChargeIds || []);
    const [amount, setAmount] = useState((initialData?.amount || 0).toFixed(2));

    useEffect(() => {
        if (!initialData) { // Only autocalculate for new payments
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

    return React.createElement('form', { onSubmit: handleSubmit, className: "space-y-6" },
        !initialData && React.createElement('div', null,
            React.createElement('label', { className: "block text-sm font-medium text-gray-300" }, "Cargos Pendientes (seleccione para autocompletar monto)"),
            React.createElement('div', { className: "mt-2 max-h-60 overflow-y-auto bg-gray-900 p-3 rounded-md border border-gray-700 space-y-2" },
                unpaidCharges.length > 0 ? unpaidCharges.sort((a,b) => a.date.localeCompare(b.date)).map(charge => 
                    React.createElement('label', { key: charge.id, className: "flex items-center justify-between p-2 bg-gray-700 rounded-md cursor-pointer hover:bg-gray-600" },
                        React.createElement('div', { className: "flex items-center" },
                            React.createElement('input', { type: "checkbox", checked: selectedChargeIds.includes(charge.id), onChange: () => handleCheckboxChange(charge.id), className: "h-4 w-4 rounded border-gray-500 bg-gray-800 text-indigo-600 focus:ring-indigo-500" }),
                            React.createElement('span', { className: "ml-3 text-white" }, `${formatDate(charge.date)} - ${charge.description}`)
                        ),
                        React.createElement('span', { className: "font-mono text-amber-300" }, formatCurrency(charge.amount))
                    )
                ) : React.createElement('p', { className: "text-gray-400 text-center py-4" }, "No hay cargos pendientes.")
            )
        ),
        React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-6" },
            React.createElement('div', null,
                React.createElement('label', { className: "block text-sm font-medium text-gray-300" }, 
                    "Monto Total Pagado ($)",
                    React.createElement('input', { type: "number", step: "0.01", name: "paymentAmount", value: amount, onChange: (e) => setAmount(e.target.value), className: "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500", required: true })
                )
            ),
            React.createElement('div', null,
                React.createElement('label', { className: "block text-sm font-medium text-gray-300" }, 
                    "Fecha de Pago",
                    React.createElement('input', { type: "date", name: "date", value: date, onChange: (e) => setDate(e.target.value), className: "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500", required: true })
                )
            )
        ),
        React.createElement('div', null,
            React.createElement('label', { className: "block text-sm font-medium text-gray-300" },
                "Notas Adicionales",
                React.createElement('textarea', { onChange: (e) => setNotes(e.target.value), className: "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 h-24" }, notes)
            )
        ),
        React.createElement('div', { className: "flex justify-end space-x-4 pt-4" },
            React.createElement('button', { type: "button", onClick: onClose, className: "px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 focus-visible:ring-indigo-500" }, "Cancelar"),
            React.createElement('button', { type: "submit", className: "px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 focus-visible:ring-indigo-500" }, "Guardar Pago")
        )
    );
};