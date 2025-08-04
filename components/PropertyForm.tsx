
import React, { useState } from 'react';

const PropertyForm = ({ onSave, onClose, initialData }) => {
    const [property, setProperty] = useState(initialData || {
        address: '',
        tenant: { name: '', email: '', phone: '' },
        rent: 0,
        tax: 0,
        contractStartDate: '',
        updateFrequencyMonths: 12,
        contractFile: null,
    });
    const [fileToUpload, setFileToUpload] = useState(null);
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
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-300">
                    Dirección
                    <input type="text" name="address" value={property.address} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white" required />
                </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="block text-sm font-medium text-gray-300">
                    Nombre Inquilino
                    <input type="text" name="tenant.name" value={property.tenant.name} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white" required />
                </label>
                <label className="block text-sm font-medium text-gray-300">
                    Email Inquilino
                    <input type="email" name="tenant.email" value={property.tenant.email} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white" />
                </label>
                <label className="block text-sm font-medium text-gray-300">
                    Teléfono Inquilino
                    <input type="text" name="tenant.phone" value={property.tenant.phone} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white" />
                </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-gray-300">
                    Alquiler Mensual ($)
                    <input type="number" name="rent" value={property.rent} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white" required />
                </label>
                <label className="block text-sm font-medium text-gray-300">
                    TSG Mensual ($)
                    <input type="number" name="tax" value={property.tax} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white" />
                </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-gray-300">
                    Fecha de Inicio de Contrato
                    <input type="date" name="contractStartDate" value={property.contractStartDate} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white" required />
                </label>
                <label className="block text-sm font-medium text-gray-300">
                    Frecuencia de Actualización (meses)
                    <input type="number" name="updateFrequencyMonths" value={property.updateFrequencyMonths} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white" min={1} required />
                </label>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300">
                    Archivo de Contrato
                    <input type="file" accept="application/pdf" onChange={handleFileChange} className="mt-1 block w-full text-white" />
                    {fileName && <span className="block text-xs text-gray-400 mt-1">Archivo seleccionado: {fileName}</span>}
                </label>
            </div>
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Guardar Propiedad</button>
            </div>
        </form>
    );
};

export default PropertyForm;
