import React, { useState } from 'react';
import { DocumentTextIcon } from './Icons.js';
import type { Property } from '../types.js';

export const PropertyForm = ({ onSave, onClose, initialData }) => {
    const [property, setProperty] = useState<Partial<Property>>(initialData || {
        address: '',
        tenant: { name: '', email: '', phone: '' },
        rent: 0,
        tax: 0,
        contractStartDate: '',
        updateFrequencyMonths: 12,
        contractFile: undefined,
    });
    const [fileToUpload, setFileToUpload] = useState(undefined);
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

    return React.createElement('form', { onSubmit: handleSubmit, className: "space-y-6" },
        React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-6" },
            React.createElement('div', { className: "space-y-4" },
                React.createElement('h4', { className: "text-lg font-semibold text-indigo-400 border-b border-gray-600 pb-2" }, "Detalles de la Propiedad"),
                React.createElement('div', null,
                    React.createElement('label', { className: "block text-sm font-medium text-gray-300" }, 
                        "Dirección",
                        React.createElement('input', { type: "text", name: "address", value: property.address, onChange: handleChange, className: "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500", required: true })
                    )
                ),
                 React.createElement('div', null,
                    React.createElement('label', { className: "block text-sm font-medium text-gray-300" }, 
                        "Alquiler Mensual Actual ($)",
                        React.createElement('input', { type: "number", min: "0", step: "0.01", name: "rent", value: property.rent, onChange: handleChange, className: "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500", required: true })
                    )
                ),
                 React.createElement('div', null,
                    React.createElement('label', { className: "block text-sm font-medium text-gray-300" }, 
                        "TSG Mensual Actual ($)",
                        React.createElement('input', { type: "number", min: "0", step: "0.01", name: "tax", value: property.tax, onChange: handleChange, className: "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" })
                    )
                )
            ),
            React.createElement('div', { className: "space-y-4" },
                React.createElement('h4', { className: "text-lg font-semibold text-indigo-400 border-b border-gray-600 pb-2" }, "Detalles del Inquilino"),
                React.createElement('div', null,
                    React.createElement('label', { className: "block text-sm font-medium text-gray-300" }, 
                        "Nombre del Inquilino",
                        React.createElement('input', { type: "text", name: "tenant.name", value: property.tenant.name, onChange: handleChange, className: "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500", required: true })
                    )
                ),
                 React.createElement('div', null,
                    React.createElement('label', { className: "block text-sm font-medium text-gray-300" }, 
                        "Email",
                        React.createElement('input', { type: "email", name: "tenant.email", value: property.tenant.email, onChange: handleChange, className: "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" })
                    )
                ),
                 React.createElement('div', null,
                    React.createElement('label', { className: "block text-sm font-medium text-gray-300" }, 
                        "Teléfono",
                        React.createElement('input', { type: "tel", name: "tenant.phone", value: property.tenant.phone, onChange: handleChange, className: "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" })
                    )
                )
            )
        ),
        React.createElement('div', { className: "space-y-4" },
             React.createElement('h4', { className: "text-lg font-semibold text-indigo-400 border-b border-gray-600 pb-2" }, "Detalles del Contrato"),
              React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-6" },
                   React.createElement('div', null,
                        React.createElement('label', { className: "block text-sm font-medium text-gray-300" }, 
                            "Fecha de Inicio del Contrato",
                            React.createElement('input', { type: "date", name: "contractStartDate", value: property.contractStartDate, onChange: handleChange, className: "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500", required: true, disabled: !!initialData })
                        )
                    ),
                    React.createElement('div', null,
                        React.createElement('label', { className: "block text-sm font-medium text-gray-300" }, 
                            "Actualización de Contrato (meses)",
                            React.createElement('input', { type: "number", name: "updateFrequencyMonths", value: property.updateFrequencyMonths, onChange: handleChange, className: "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500", required: true })
                        )
                    )
              ),
             React.createElement('div', null,
                React.createElement('label', { className: "block text-sm font-medium text-gray-300" }, "Cargar Contrato Digitalizado"),
                React.createElement('div', { className: "mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md" },
                    React.createElement('div', { className: "space-y-1 text-center" },
                        React.createElement(DocumentTextIcon, { className: "mx-auto h-12 w-12 text-gray-500" }),
                        React.createElement('div', { className: "flex text-sm text-gray-400" },
                            React.createElement('label', { className: "relative cursor-pointer bg-gray-700 rounded-md font-medium text-indigo-400 hover:text-indigo-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-800 focus-within:ring-indigo-500 px-2" },
                                React.createElement('span', null, "Subir un archivo"),
                                React.createElement('input', { name: "file-upload", type: "file", className: "sr-only", onChange: handleFileChange, accept: ".pdf,.doc,.docx,.jpg,.png" })
                            ),
                            React.createElement('p', { className: "pl-1" }, "o arrastrar y soltar")
                        ),
                         React.createElement('p', { className: "text-xs text-gray-500" }, fileName ? `Archivo seleccionado: ${fileName}` : "PDF, DOCX, PNG, JPG")
                    )
                )
            )
        ),
        React.createElement('div', { className: "flex justify-end space-x-4 pt-4" },
            React.createElement('button', { type: "button", onClick: onClose, className: "px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 focus-visible:ring-indigo-500" }, "Cancelar"),
            React.createElement('button', { type: "submit", className: "px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 focus-visible:ring-indigo-500" }, "Guardar Propiedad")
        )
    );
};
