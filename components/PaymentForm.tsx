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
        // ... Copia aquí el JSX del formulario de pago ...
        <div>Payment Form</div>
    );
};

export default PaymentForm;
