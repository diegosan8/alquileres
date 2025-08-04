import React, { useState } from 'react';

const PropertyForm = ({ onSave, onClose, initialData }) => {
    const [property, setProperty] = useState(initialData || {
        address: '',
        tenant: { name: '', email: '', phone: '' },
        rent: 0,
        tax: 0,
        contractStartDate: '',
        updateFrequencyMonths: 12,
        contractFile: null as File | null,
    });
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [fileName, setFileName] = useState(initialData?.contractFile?.name || '');

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        if (name.startsWith('tenant.')) {
            const tenantField = name.split('.')[1];
            setProperty(prev => ({ ...prev, tenant: { ...prev.tenant, [tenantField]: value } }));
        } else {
            setProperty(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
        }
    };
    
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
           setFileToUpload(file);
           setFileName(file.name);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSave({ ...property, id: initialData?.id }, fileToUpload);
    };

    return (
        // ... Copia aquí el JSX del formulario de propiedad ...
        <div>Property Form</div>
    );
};

export default PropertyForm;
