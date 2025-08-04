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
        // ... Copia aquí el JSX del panel de inflación ...
        <div>Inflation Panel</div>
    );
};

export default InflationPanel;
