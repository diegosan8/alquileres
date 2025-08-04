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
        // ... Copia aquí el JSX del panel de socios ...
        <div>Owners Panel</div>
    );
};

export default OwnersPanel;
