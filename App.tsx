



import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HomeIcon, PlusIcon, UsersIcon, ChartPieIcon, DocumentTextIcon, XIcon, TrashIcon, PencilIcon, TrendingUpIcon, CashIcon, ClipboardListIcon, SparklesIcon } from './components/Icons.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db, storage, firebaseError } from './services/firebase.js';
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { generateMonthlyReport } from './services/geminiService.js';

// --- Type Definitions ---
interface Payment {
    id: string;
    date: string;
    amount: number;
    notes: string;
    allocatedChargeIds: string[];
    type?: string;
}

interface ValueHistory {
    date: string;
    rent: number;
    tax: number;
}

interface ContractFile {
    name: string;
    type: string;
    storagePath: string;
    downloadURL: string;
}

interface Property {
    id: string;
    address: string;
    tenant: {
        name: string;
        email: string;
        phone: string;
    };
    rent: number;
    tax: number;
    contractStartDate: string;
    updateFrequencyMonths: number;
    contractFile?: ContractFile;
    payments: Payment[];
    valueHistory: ValueHistory[];
}

interface Owner {
    id: string;
    name: string;
    percentage: number;
}

interface InflationRecord {
    id: string; // YYYY-MM
    yearMonth: string;
    rate: number;
}

interface Deposit {
    id: string;
    date: string;
    amount: number;
}

interface Distributions {
    [month: string]: {
        [ownerId: string]: Deposit[];
    };
}

const initialOwners: Owner[] = [
    { id: '1', name: 'Socio 1', percentage: 25 },
    { id: '2', name: 'Socio 2', percentage: 25 },
    { id: '3', name: 'Socio 3', percentage: 25 },
    { id: '4', name: 'Socio 4', percentage: 25 },
];

// --- Helper Functions ---
const generateChargesForProperty = (property: Property) => {
    const charges = [];
    if (!property.contractStartDate || !property.valueHistory || property.valueHistory.length === 0) {
        return [];
    }

    let currentDate = new Date(property.contractStartDate);
    currentDate.setMinutes(currentDate.getMinutes() + currentDate.getTimezoneOffset());
    const today = new Date();
    
    const sortedHistory = [...property.valueHistory].sort((a, b) => a.date.localeCompare(b.date));

    while (currentDate <= today) {
        const chargeDateStr = currentDate.toISOString().slice(0, 10);
        
        const applicableValues = sortedHistory
            .filter(h => h.date <= chargeDateStr)
            .pop(); // Get the latest one on or before the charge date

        if(applicableValues) {
            const { rent, tax } = applicableValues;
            if (rent > 0) {
                charges.push({ id: `${property.id}-alquiler-${chargeDateStr}`, date: chargeDateStr, description: 'Alquiler', amount: rent });
            }
            if (tax > 0) {
                charges.push({ id: `${property.id}-tsg-${chargeDateStr}`, date: chargeDateStr, description: 'TSG', amount: tax });
            }
        }
        
        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return charges;
};

const formatDate = (dateString, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date.toLocaleDateString('es-ES', options);
}

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount || 0);
}

// --- Sub-Components ---

const Spinner = () => React.createElement('div', { className: "flex items-center justify-center h-full" },
    React.createElement('div', { className: "animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500" })
);

const FirebaseErrorView = ({ error }) => {
    const isConfigError = error.message.includes("configuración de Firebase");

    return React.createElement('div', { className: "flex flex-col items-center justify-center h-screen bg-gray-900 text-gray-300 p-8" },
        React.createElement('div', { className: "bg-red-900 border border-red-700 rounded-lg p-8 max-w-2xl text-center" },
            React.createElement('h2', { className: "text-2xl font-bold text-white mb-4" }, "Error de Conexión con Firebase"),
            isConfigError
                ? React.createElement('div', { className: "text-left space-y-3" },
                    React.createElement('p', null, React.createElement('strong', null, "Acción Requerida:"), " Parece que estás usando la configuración de ejemplo de Firebase."),
                    React.createElement('p', null, "Para conectar la aplicación a tu base de datos, necesitas añadir tus propias credenciales de Firebase en el siguiente archivo:"),
                    React.createElement('code', { className: "block bg-gray-800 p-2 rounded-md text-amber-300 my-2" }, "services/firebase.ts"),
                    React.createElement('p', { className: "font-semibold mt-4" }, "Cómo obtener tus credenciales:"),
                    React.createElement('ol', { className: "list-decimal list-inside space-y-1" },
                        React.createElement('li', null, "Ve a la ", React.createElement('a', { href: "https://console.firebase.google.com/", target: "_blank", rel: "noopener noreferrer", className: "text-indigo-400 hover:underline" }, "Consola de Firebase"), "."),
                        React.createElement('li', null, "Crea un nuevo proyecto o selecciona uno existente."),
                        React.createElement('li', null, "En la configuración del proyecto (icono de engranaje), ve a la pestaña 'General'."),
                        React.createElement('li', null, "Bajo 'Tus aplicaciones', crea una nueva 'Aplicación web' (si aún no lo has hecho)."),
                        React.createElement('li', null, "Copia el objeto `firebaseConfig` que se muestra."),
                        React.createElement('li', null, "Pega este objeto en `services/firebase.ts`, reemplazando los valores de marcador de posición."),
                    ),
                    React.createElement('p', { className: "mt-4" }, "Después de actualizar el archivo, recarga la aplicación.")
                )
                : React.createElement('div', { className: "text-left" },
                    React.createElement('p', { className: "mb-4" }, "Servicio de Firestore no disponible"),
                    React.createElement('p', { className: "mb-4" }, "La base de datos Firestore no está habilitada para este proyecto en Firebase."),
                    React.createElement('p', { className: "font-semibold mb-2" }, "Para solucionarlo, por favor siga estos pasos:"),
                    React.createElement('ol', { className: "list-decimal list-inside space-y-1 mb-4" },
                        React.createElement('li', null, "Vaya a la consola de Firebase de su proyecto (", React.createElement('a', { href: "https://console.firebase.google.com/", target: "_blank", rel: "noopener noreferrer", className: "text-indigo-400 hover:underline" }, "https://console.firebase.google.com/"), ")."),
                        React.createElement('li', null, "En el menú de la izquierda, en la sección \"Compilación\", haga clic en \"Firestore Database\"."),
                        React.createElement('li', null, "Haga clic en el botón \"Crear base de datos\"."),
                        React.createElement('li', null, "Elija el modo de producción o prueba para empezar."),
                        React.createElement('li', null, "Seleccione una ubicación para sus datos."),
                        React.createElement('li', null, "Haga clic en \"Habilitar\"."),
                    ),
                    React.createElement('p', null, "Una vez habilitado, recargue esta aplicación."),
                ),
            React.createElement('p', { className: "text-xs text-gray-500 mt-6" },
                "Error original: ", error.message
            )
        )
    );
};

const Modal = ({ children, title, onClose, size = 'xl', zIndex = 50 }) => {
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-2xl',
        xl: 'max-w-4xl',
        '4xl': 'max-w-7xl'
    };
    return React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center p-4", style: { zIndex } },
        React.createElement('div', { className: `bg-gray-800 rounded-lg shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col` },
            React.createElement('div', { className: "flex justify-between items-center p-4 border-b border-gray-700" },
                React.createElement('h3', { className: "text-xl font-semibold text-white" }, title),
                React.createElement('button', { onClick: onClose, className: "text-gray-400 hover:text-white" },
                    React.createElement(XIcon, { className: "h-6 w-6" })
                )
            ),
            React.createElement('div', { className: "p-6 overflow-y-auto" },
                children
            )
        )
    );
};

const PropertyForm = ({ onSave, onClose, initialData }) => {
    const [property, setProperty] = useState(initialData || {
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

const PaymentForm = ({ onSave, onClose, unpaidCharges, initialData }) => {
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
                React.createElement('textarea', { name: "notes", rows: 3, value: notes, onChange: (e) => setNotes(e.target.value), className: "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" })
            )
        ),
        React.createElement('div', { className: "flex justify-end space-x-4 pt-4" },
            React.createElement('button', { type: "button", onClick: onClose, className: "px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 focus-visible:ring-indigo-500" }, "Cancelar"),
            React.createElement('button', { type: "submit", className: "px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 focus-visible:ring-indigo-500" }, "Guardar Pago")
        )
    );
};

const RentUpdateForm = ({ onSave, onClose, currentRent, currentTax }) => {
    const [newRent, setNewRent] = useState(currentRent);
    const [newTax, setNewTax] = useState(currentTax);
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ date, rent: parseFloat(newRent), tax: parseFloat(newTax) });
    }

    return React.createElement('form', { onSubmit: handleSubmit, className: "space-y-4" },
        React.createElement('div', null,
            React.createElement('label', { className: "block text-sm font-medium text-gray-300" }, 
                "Fecha de entrada en vigencia",
                React.createElement('input', { type: "date", value: date, onChange: (e) => setDate(e.target.value), className: "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500", required: true })
            )
        ),
        React.createElement('div', null,
            React.createElement('label', { className: "block text-sm font-medium text-gray-300" }, 
                "Nuevo Alquiler Mensual ($)",
                React.createElement('input', { type: "number", value: newRent, onChange: (e) => setNewRent(e.target.value), className: "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500", required: true })
            )
        ),
        React.createElement('div', null,
            React.createElement('label', { className: "block text-sm font-medium text-gray-300" }, 
                "Nuevo TSG Mensual ($)",
                React.createElement('input', { type: "number", value: newTax, onChange: (e) => setNewTax(e.target.value), className: "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" })
            )
        ),
        React.createElement('div', { className: "flex justify-end space-x-4 pt-4" },
            React.createElement('button', { type: "button", onClick: onClose, className: "px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500" }, "Cancelar"),
            React.createElement('button', { type: "submit", className: "px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700" }, "Guardar Actualización")
        )
    );
};

const PropertyCard = ({ property, onAddPayment, onEdit, onDelete, onUpdateRent }) => {
    const { allCharges, unpaidCharges, totalDebt, totalPaid } = useMemo(() => {
        const allCharges = generateChargesForProperty(property);
        const paidChargeIds = new Set(property.payments.flatMap(p => p.allocatedChargeIds));
        const unpaidCharges = allCharges.filter(c => !paidChargeIds.has(c.id));
        const totalDebt = unpaidCharges.reduce((sum, c) => sum + c.amount, 0);
        const totalPaid = property.payments.reduce((sum, p) => sum + p.amount, 0);
        // A simple balance might be misleading, debt is more actionable
        return { allCharges, unpaidCharges, totalDebt, totalPaid };
    }, [property]);

    const isRentReviewDue = useMemo(() => {
        if (!property.contractStartDate) return false;
        const startDate = new Date(property.contractStartDate);
        const today = new Date();
        
        const lastUpdate = property.valueHistory.length > 1 
            ? new Date(Math.max(...property.valueHistory.map(vh => new Date(vh.date).getTime())))
            : startDate;

        const monthsSinceLastUpdate = (today.getFullYear() - lastUpdate.getFullYear()) * 12 + (today.getMonth() - lastUpdate.getMonth());
        
        return monthsSinceLastUpdate >= property.updateFrequencyMonths;
    }, [property.contractStartDate, property.updateFrequencyMonths, property.valueHistory]);


    const sortedPayments = [...property.payments].sort((a,b) => b.date.localeCompare(a.date));

    return React.createElement('div', { className: "bg-gray-800 rounded-lg shadow-lg overflow-hidden" },
        React.createElement('div', { className: "p-5" },
            React.createElement('div', { className: "flex justify-between items-start" },
                React.createElement('div', null,
                    React.createElement('h3', { className: "text-xl font-bold text-white" }, property.address),
                    React.createElement('p', { className: "text-sm text-gray-400" }, `Inquilino: ${property.tenant.name}`)
                ),
                React.createElement('div', { className: "flex space-x-2" },
                    React.createElement('button', { onClick: () => onEdit(property), className: "p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full" }, React.createElement(PencilIcon, { className: "h-5 w-5" })),
                    React.createElement('button', { onClick: () => onDelete(property), className: "p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded-full" }, React.createElement(TrashIcon, { className: "h-5 w-5" }))
                )
            ),
             isRentReviewDue && React.createElement('div', {className: "mt-3 p-2 bg-yellow-900/50 border border-yellow-700 rounded-lg text-center text-yellow-300 text-sm"}, "Revisión de alquiler pendiente"),
            React.createElement('div', { className: "mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center" },
                React.createElement('div', null,
                    React.createElement('p', { className: "text-sm text-gray-400" }, "Alquiler Actual"),
                    React.createElement('p', { className: "text-lg font-semibold text-green-400" }, formatCurrency(property.rent))
                ),
                React.createElement('div', null,
                    React.createElement('p', { className: "text-sm text-gray-400" }, "Deuda Pendiente"),
                    React.createElement('p', { className: `text-lg font-semibold ${totalDebt > 0 ? 'text-red-400' : 'text-gray-300'}` }, formatCurrency(totalDebt))
                ),
                React.createElement('div', null,
                    React.createElement('p', { className: "text-sm text-gray-400" }, "Total Pagado"),
                    React.createElement('p', { className: "text-lg font-semibold text-gray-300" }, formatCurrency(totalPaid))
                ),
                React.createElement('div', null,
                    React.createElement('p', { className: "text-sm text-gray-400" }, "Contrato"),
                     property.contractFile
                        ? React.createElement('a', { href: property.contractFile.downloadURL, target: "_blank", rel: "noopener noreferrer", className: "text-lg font-semibold text-indigo-400 hover:underline" }, "Ver Archivo")
                        : React.createElement('p', { className: "text-lg font-semibold text-gray-500" }, "No disponible")
                )
            ),
             React.createElement('div', { className: "mt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2" },
                React.createElement('button', { onClick: () => onAddPayment(property.id, unpaidCharges), className: "w-full flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700" }, 
                    React.createElement(CashIcon, { className: "h-5 w-5 mr-2" }),
                    "Registrar Pago"
                ),
                React.createElement('button', { onClick: () => onUpdateRent(property), className: "w-full flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-300 bg-gray-700 hover:bg-gray-600" }, 
                    React.createElement(TrendingUpIcon, { className: "h-5 w-5 mr-2" }),
                    "Actualizar Alquiler"
                )
            )
        ),
        React.createElement('div', { className: "px-5 pb-5" },
            React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
                React.createElement('div', null,
                    React.createElement('h4', { className: "text-md font-semibold text-gray-300 mb-2 border-b border-gray-700 pb-1" }, "Cargos Pendientes"),
                    React.createElement('div', { className: "space-y-2 max-h-48 overflow-y-auto" },
                        unpaidCharges.length > 0 ? unpaidCharges.sort((a,b) => a.date.localeCompare(b.date)).map(charge => React.createElement('div', { key: charge.id, className: "flex justify-between items-center text-sm p-1.5 bg-gray-900 rounded" },
                            React.createElement('span', { className: "text-gray-400" }, `${formatDate(charge.date)} - ${charge.description}`),
                            React.createElement('span', { className: "font-mono text-amber-400" }, formatCurrency(charge.amount))
                        )) : React.createElement('p', { className: "text-sm text-gray-500 italic" }, "No hay cargos pendientes.")
                    )
                ),
                 React.createElement('div', null,
                    React.createElement('h4', { className: "text-md font-semibold text-gray-300 mb-2 border-b border-gray-700 pb-1" }, "Últimos Pagos"),
                    React.createElement('div', { className: "space-y-2 max-h-48 overflow-y-auto" },
                        sortedPayments.length > 0 ? sortedPayments.slice(0, 5).map(payment => React.createElement('div', { key: payment.id, className: "flex justify-between items-center text-sm p-1.5 bg-gray-900 rounded" },
                             React.createElement('span', { className: "text-gray-400" }, formatDate(payment.date)),
                             React.createElement('span', { className: "font-mono text-green-400" }, formatCurrency(payment.amount))
                        )) : React.createElement('p', { className: "text-sm text-gray-500 italic" }, "No se han registrado pagos.")
                    )
                )
            )
        )
    );
};

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
    
    return React.createElement('div', { className: "bg-gray-800 p-6 rounded-lg max-w-2xl mx-auto" },
        React.createElement('h3', { className: "text-xl font-bold text-white mb-4" }, "Gestionar Socios"),
        React.createElement('div', { className: "space-y-4" },
            localOwners.map(owner => 
                React.createElement('div', { key: owner.id, className: "flex items-center space-x-4" },
                    React.createElement('input', { type: "text", value: owner.name, onChange: (e) => handleNameChange(owner.id, e.target.value), className: "flex-grow bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" }),
                    React.createElement('input', { type: "number", value: owner.percentage, onChange: (e) => handlePercentageChange(owner.id, e.target.value), className: "w-24 bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" }),
                     React.createElement('span', { className: "text-gray-300" }, "%")
                )
            )
        ),
        React.createElement('div', { className: "mt-6 border-t border-gray-700 pt-4" },
            React.createElement('div', { className: `flex justify-between items-center font-bold text-lg ${totalPercentage === 100 ? 'text-green-400' : 'text-red-400'}` },
                React.createElement('span', null, "Total:"),
                React.createElement('span', null, `${totalPercentage.toFixed(2)}%`)
            )
        ),
        React.createElement('div', { className: "flex justify-end mt-6" },
            React.createElement('button', { onClick: handleSave, className: "px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed", disabled: totalPercentage !== 100 }, "Guardar Cambios")
        )
    );
};

const InflationPanel = ({ inflationData, onSave }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [rates, setRates] = useState({}); // { 'YYYY-MM': rate }

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
    
    return React.createElement('div', { className: "bg-gray-800 p-6 rounded-lg max-w-4xl mx-auto" },
        React.createElement('h3', { className: "text-xl font-bold text-white mb-4" }, "Registro de Inflación Mensual"),
         React.createElement('div', { className: "flex items-center space-x-4 mb-6" },
            React.createElement('label', { className: "text-gray-300" }, 
                "Año:",
                React.createElement('select', { value: year, onChange: (e) => setYear(parseInt(e.target.value)), className: "ml-2 bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" },
                    Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => React.createElement('option', { key: y, value: y }, y))
                )
            )
        ),
        React.createElement('div', { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" },
            months.map(month => {
                 const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
                 const monthName = new Date(year, month - 1).toLocaleString('es-ES', { month: 'long' });
                 return React.createElement('div', { key: month },
                    React.createElement('label', { className: "block text-sm font-medium text-gray-300 capitalize" }, 
                        monthName,
                        React.createElement('div', {className: "relative mt-1"},
                            React.createElement('input', { type: "number", step: "0.01", value: rates[yearMonth] || '', onChange: (e) => handleRateChange(month, e.target.value), className: "w-full bg-gray-700 border border-gray-600 rounded-md py-2 pl-3 pr-8 text-white" }),
                            React.createElement('div', {className: "absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"}, React.createElement('span', {className: "text-gray-500 sm:text-sm"}, "%"))
                        )
                    )
                );
            })
        ),
         React.createElement('div', { className: "flex justify-end mt-6" },
            React.createElement('button', { onClick: handleSave, className: "px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700" }, "Guardar Inflación")
        )
    );
};

const FinancialsDashboard = ({ properties, owners, onGenerateReport, aiEnabled }) => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [report, setReport] = useState('');
    const [generatingReport, setGeneratingReport] = useState(false);

    const monthlyData = useMemo(() => {
        const incomeByMonth = {};
        properties.forEach(p => {
            p.payments.forEach(payment => {
                const month = payment.date.slice(0, 7);
                if (!incomeByMonth[month]) {
                    incomeByMonth[month] = 0;
                }
                incomeByMonth[month] += payment.amount;
            });
        });
        return incomeByMonth;
    }, [properties]);
    
    const totalDebt = useMemo(() => {
        return properties.reduce((total, property) => {
            const allCharges = generateChargesForProperty(property);
            const paidChargeIds = new Set(property.payments.flatMap(p => p.allocatedChargeIds));
            const unpaidCharges = allCharges.filter(c => !paidChargeIds.has(c.id));
            return total + unpaidCharges.reduce((sum, c) => sum + c.amount, 0);
        }, 0);
    }, [properties]);
    
    const totalAssets = useMemo(() => properties.reduce((sum, p) => sum + p.rent, 0), [properties]);
    const selectedMonthIncome = monthlyData[selectedMonth] || 0;

    const ownerDistribution = useMemo(() => {
        return owners.map(owner => ({
            ...owner,
            share: selectedMonthIncome * (owner.percentage / 100)
        }));
    }, [owners, selectedMonthIncome]);

    const handleGenerateReport = async () => {
        setGeneratingReport(true);
        setReport('');
        
        const propertiesDueForReview = properties
            .filter(p => {
                 if (!p.contractStartDate) return false;
                const lastUpdate = p.valueHistory.length > 1 
                    ? new Date(Math.max(...p.valueHistory.map(vh => new Date(vh.date).getTime())))
                    : new Date(p.contractStartDate);
                const today = new Date();
                const monthsSinceLastUpdate = (today.getFullYear() - lastUpdate.getFullYear()) * 12 + (today.getMonth() - lastUpdate.getMonth());
                return monthsSinceLastUpdate >= p.updateFrequencyMonths;
            })
            .map(p => p.address);

        const result = await onGenerateReport(
            selectedMonth,
            selectedMonthIncome,
            ownerDistribution,
            propertiesDueForReview
        );
        setReport(result);
        setGeneratingReport(false);
    };

    return React.createElement('div', { className: "space-y-8" },
        React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-3 gap-6" },
            React.createElement('div', { className: "bg-gray-800 p-6 rounded-lg" },
                React.createElement('h4', { className: "text-gray-400 text-sm font-medium" }, "Activos Totales (Alquileres)"),
                React.createElement('p', { className: "text-3xl font-bold text-white mt-1" }, formatCurrency(totalAssets))
            ),
            React.createElement('div', { className: "bg-gray-800 p-6 rounded-lg" },
                React.createElement('h4', { className: "text-gray-400 text-sm font-medium" }, "Deuda Total Pendiente"),
                React.createElement('p', { className: "text-3xl font-bold text-red-400 mt-1" }, formatCurrency(totalDebt))
            ),
            React.createElement('div', { className: "bg-gray-800 p-6 rounded-lg" },
                React.createElement('h4', { className: "text-gray-400 text-sm font-medium" }, "Ingresos (Mes Seleccionado)"),
                React.createElement('p', { className: "text-3xl font-bold text-green-400 mt-1" }, formatCurrency(selectedMonthIncome))
            )
        ),
        React.createElement('div', { className: "bg-gray-800 p-6 rounded-lg" },
            React.createElement('h3', { className: "text-xl font-bold text-white mb-4" }, "Distribución e Informes Mensuales"),
            React.createElement('div', { className: "flex items-center space-x-4 mb-4" },
                React.createElement('label', { className: "text-gray-300" }, 
                    "Seleccionar Mes:",
                    React.createElement('input', { type: "month", value: selectedMonth, onChange: (e) => setSelectedMonth(e.target.value), className: "ml-2 bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" })
                )
            ),
            React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-6" },
                React.createElement('div', null,
                    React.createElement('h4', { className: "text-lg font-semibold text-indigo-400 mb-2" }, `Distribución para ${selectedMonth}`),
                    React.createElement('div', { className: "space-y-2" },
                        ownerDistribution.map(owner => 
                            React.createElement('div', { key: owner.id, className: "flex justify-between p-2 bg-gray-700/50 rounded" },
                                React.createElement('span', { className: "text-gray-300" }, `${owner.name} (${owner.percentage}%)`),
                                React.createElement('span', { className: "font-mono text-green-300" }, formatCurrency(owner.share))
                            )
                        )
                    )
                ),
                React.createElement('div', null,
                    React.createElement('h4', { className: "text-lg font-semibold text-indigo-400 mb-2" }, "Asistente IA de Informes"),
                     aiEnabled ? React.createElement('div', { className: "flex flex-col h-full" },
                        React.createElement('button', { onClick: handleGenerateReport, disabled: generatingReport, className: "w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400" },
                           generatingReport ? React.createElement(React.Fragment, null, React.createElement('div', {className: "animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"}), "Generando...") : React.createElement(React.Fragment, null, React.createElement(SparklesIcon, { className: "h-5 w-5 mr-2" }), "Generar Informe con IA")
                        ),
                         (generatingReport || report) && React.createElement('div', { className: "mt-4 p-4 bg-gray-900 rounded-md h-full min-h-[150px] whitespace-pre-wrap text-gray-300 overflow-y-auto" }, generatingReport ? "El asistente de IA está redactando el informe..." : report)
                    ) : React.createElement('div', {className: "p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg text-yellow-300"}, "El servicio de IA no está configurado. Por favor, agregue una API_KEY para habilitar esta función.")
                )
            )
        )
    );
};


// --- Main App Component ---
const App = () => {
    if (firebaseError) {
        return React.createElement(FirebaseErrorView, { error: firebaseError });
    }

    const [loading, setLoading] = useState(true);
    const [properties, setProperties] = useState<Property[]>([]);
    const [owners, setOwners] = useState<Owner[]>([]);
    const [inflationData, setInflationData] = useState<InflationRecord[]>([]);
    const [distributions, setDistributions] = useState<Distributions>({});
    const [activeView, setActiveView] = useState('dashboard'); // dashboard, properties, owners, inflation
    const [modal, setModal] = useState<{ type: string | null; data: any }>({ type: null, data: null });
    const [isSaving, setIsSaving] = useState(false);

    const aiEnabled = useMemo(() => !!process.env.API_KEY, []);

    // --- Data Fetching ---
    useEffect(() => {
        const fetchData = async () => {
            if (!db) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const [propsSnapshot, ownersSnapshot, inflationSnapshot] = await Promise.all([
                    getDocs(collection(db, 'properties')),
                    getDocs(collection(db, 'owners')),
                    getDocs(collection(db, 'inflation'))
                ]);

                const propsData = propsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
                const ownersData = ownersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Owner));
                const inflationRecords = inflationSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InflationRecord));

                setProperties(propsData.sort((a,b) => a.address.localeCompare(b.address)));
                setOwners(ownersData.length > 0 ? ownersData.sort((a,b) => a.name.localeCompare(b.name)) : initialOwners);
                setInflationData(inflationRecords);
            } catch (error) {
                console.error("Error fetching data:", error);
                // The main firebaseError view will be shown if db is not initialized
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    
    const closeModal = () => setModal({ type: null, data: null });
    
    // --- Handlers ---
    const handleSaveProperty = useCallback(async (propertyData, file) => {
        setIsSaving(true);
        const isNew = !propertyData.id;
        const id = isNew ? `prop_${new Date().getTime()}` : propertyData.id;
        const docRef = doc(db, 'properties', id);

        let finalPropertyData = { ...propertyData };
        delete finalPropertyData.id; // Don't save id field in the document

        try {
            if(isNew) {
                // For new properties, create the initial value history entry
                finalPropertyData.valueHistory = [{
                    date: propertyData.contractStartDate,
                    rent: propertyData.rent,
                    tax: propertyData.tax,
                }];
                finalPropertyData.payments = [];
            }
            
            if (file) {
                 if (propertyData.contractFile?.storagePath) {
                    // Delete old file first
                    await deleteObject(ref(storage, propertyData.contractFile.storagePath));
                }
                const storagePath = `contracts/${id}/${file.name}`;
                const fileRef = ref(storage, storagePath);
                await uploadBytes(fileRef, file);
                const downloadURL = await getDownloadURL(fileRef);
                finalPropertyData.contractFile = {
                    name: file.name,
                    type: file.type,
                    storagePath,
                    downloadURL
                };
            }

            await setDoc(docRef, finalPropertyData, { merge: true });
            
            if (isNew) {
                setProperties(prev => [...prev, { ...finalPropertyData, id }].sort((a,b) => a.address.localeCompare(b.address)));
            } else {
                setProperties(prev => prev.map(p => p.id === id ? { ...p, ...finalPropertyData, id } : p));
            }
            closeModal();
        } catch (error) {
            console.error("Error saving property:", error);
            alert("Error al guardar la propiedad.");
        } finally {
            setIsSaving(false);
        }
    }, []);
    
    const handleDeleteProperty = useCallback(async (property) => {
        if (!window.confirm(`¿Está seguro de que desea eliminar la propiedad en ${property.address}? Esta acción no se puede deshacer.`)) return;

        try {
             if (property.contractFile?.storagePath) {
                await deleteObject(ref(storage, property.contractFile.storagePath));
            }
            await deleteDoc(doc(db, 'properties', property.id));
            setProperties(prev => prev.filter(p => p.id !== property.id));
        } catch(error) {
            console.error("Error deleting property:", error);
            alert("Error al eliminar la propiedad.");
        }
    }, []);

    const handleSavePayment = useCallback(async (propertyId, payment) => {
        const property = properties.find(p => p.id === propertyId);
        if (!property) return;
        
        const existingPaymentIndex = property.payments.findIndex(p => p.id === payment.id);
        let newPayments;

        if (existingPaymentIndex > -1) {
            newPayments = [...property.payments];
            newPayments[existingPaymentIndex] = payment;
        } else {
            newPayments = [...property.payments, payment];
        }

        try {
            const docRef = doc(db, 'properties', propertyId);
            await setDoc(docRef, { payments: newPayments }, { merge: true });
            setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, payments: newPayments } : p));
            closeModal();
        } catch (error) {
            console.error("Error saving payment:", error);
            alert("Error al guardar el pago.");
        }
    }, [properties]);
    
    const handleUpdateRent = useCallback(async (propertyId, newValues) => {
        const property = properties.find(p => p.id === propertyId);
        if (!property) return;

        const newValueHistory = [...(property.valueHistory || [])];
        // Prevent duplicate entries for the same date
        const existingIndex = newValueHistory.findIndex(vh => vh.date === newValues.date);
        if(existingIndex > -1) {
            newValueHistory[existingIndex] = newValues;
        } else {
            newValueHistory.push(newValues);
        }
        
        // Also update the current rent/tax on the property object itself
        const updatedProperty = {
            ...property,
            rent: newValues.rent,
            tax: newValues.tax,
            valueHistory: newValueHistory
        };

        try {
            const docRef = doc(db, 'properties', propertyId);
            await setDoc(docRef, { 
                rent: newValues.rent,
                tax: newValues.tax,
                valueHistory: newValueHistory
             }, { merge: true });
            setProperties(prev => prev.map(p => p.id === propertyId ? updatedProperty : p));
            closeModal();
        } catch (error) {
            console.error("Error updating rent:", error);
            alert("Error al actualizar el alquiler.");
        }
    }, [properties]);
    
    const handleSaveOwners = useCallback(async (newOwners) => {
        const batch = writeBatch(db);
        newOwners.forEach(owner => {
            const docRef = doc(db, 'owners', owner.id);
            batch.set(docRef, { name: owner.name, percentage: owner.percentage });
        });
        
        try {
            await batch.commit();
            setOwners(newOwners.sort((a,b) => a.name.localeCompare(b.name)));
            alert("Socios guardados con éxito.");
        } catch (error) {
            console.error("Error saving owners:", error);
            alert("Error al guardar los socios.");
        }
    }, []);

    const handleSaveInflation = useCallback(async (newInflationData) => {
        const batch = writeBatch(db);
        newInflationData.forEach(record => {
            if (record.id && record.rate > 0) { // Only save records with a rate
                 const docRef = doc(db, 'inflation', record.id);
                 batch.set(docRef, { yearMonth: record.yearMonth, rate: record.rate });
            }
        });

        try {
            await batch.commit();
            // Refetch or update local state
             const inflationSnapshot = await getDocs(collection(db, 'inflation'));
             const inflationRecords = inflationSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InflationRecord));
             setInflationData(inflationRecords);
            alert("Datos de inflación guardados con éxito.");
        } catch (error) {
            console.error("Error saving inflation data:", error);
            alert("Error al guardar los datos de inflación.");
        }
    }, []);


    // --- Render Logic ---
    const renderView = () => {
        if (loading) {
            return React.createElement(Spinner, null);
        }
        switch (activeView) {
            case 'dashboard':
                return React.createElement(FinancialsDashboard, { properties, owners, onGenerateReport: generateMonthlyReport, aiEnabled });
            case 'properties':
                return React.createElement('div', { className: "space-y-6" },
                    properties.map(p => React.createElement(PropertyCard, {
                        key: p.id,
                        property: p,
                        onAddPayment: (propertyId, unpaidCharges) => setModal({ type: 'ADD_PAYMENT', data: { propertyId, unpaidCharges } }),
                        onEdit: (property) => setModal({ type: 'EDIT_PROPERTY', data: property }),
                        onDelete: handleDeleteProperty,
                        onUpdateRent: (property) => setModal({ type: 'UPDATE_RENT', data: property }),
                    }))
                );
            case 'owners':
                return React.createElement(OwnersPanel, { owners, onSave: handleSaveOwners });
            case 'inflation':
                return React.createElement(InflationPanel, { inflationData, onSave: handleSaveInflation });
            default:
                return React.createElement('div', null, "Vista no encontrada");
        }
    };
    
    const renderModal = () => {
        if (!modal.type) return null;

        switch (modal.type) {
            case 'ADD_PROPERTY':
                return React.createElement(Modal, { 
                    title: "Añadir Nueva Propiedad", 
                    onClose: closeModal,
                    children: React.createElement(PropertyForm, { onSave: handleSaveProperty, onClose: closeModal, initialData: null })
                });
            case 'EDIT_PROPERTY':
                 return React.createElement(Modal, { 
                    title: `Editar Propiedad: ${modal.data.address}`, 
                    onClose: closeModal,
                    children: React.createElement(PropertyForm, { onSave: handleSaveProperty, onClose: closeModal, initialData: modal.data })
                });
            case 'ADD_PAYMENT':
                 return React.createElement(Modal, { 
                    title: "Registrar Nuevo Pago", 
                    onClose: closeModal, 
                    size: 'md',
                    children: React.createElement(PaymentForm, { 
                        onSave: (payment) => handleSavePayment(modal.data.propertyId, payment), 
                        onClose: closeModal, 
                        unpaidCharges: modal.data.unpaidCharges,
                        initialData: null
                    })
                });
            case 'UPDATE_RENT':
                return React.createElement(Modal, { 
                    title: "Actualizar Alquiler", 
                    onClose: closeModal, 
                    size: 'sm',
                    children: React.createElement(RentUpdateForm, {
                        onSave: (newValues) => handleUpdateRent(modal.data.id, newValues),
                        onClose: closeModal,
                        currentRent: modal.data.rent,
                        currentTax: modal.data.tax,
                    })
                });
            default:
                return null;
        }
    };
    
    const NavItem = ({ icon, label, viewName }) => {
        const isActive = activeView === viewName;
        return React.createElement('button', {
            onClick: () => setActiveView(viewName),
            className: `flex flex-col items-center justify-center space-y-1 w-full py-2 px-1 rounded-lg ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`
          },
          React.createElement(icon, { className: "h-6 w-6" }),
          React.createElement('span', { className: "text-xs font-medium" }, label)
        );
    };

    return React.createElement('div', { className: "flex h-screen bg-gray-900" },
        React.createElement('aside', { className: "w-20 flex-shrink-0 bg-gray-800 p-2" },
            React.createElement('div', { className: "flex flex-col items-center space-y-4" },
                React.createElement(NavItem, { icon: ChartPieIcon, label: "Dashboard", viewName: "dashboard" }),
                React.createElement(NavItem, { icon: HomeIcon, label: "Propiedades", viewName: "properties" }),
                React.createElement(NavItem, { icon: UsersIcon, label: "Socios", viewName: "owners" }),
                React.createElement(NavItem, { icon: TrendingUpIcon, label: "Inflación", viewName: "inflation" })
            )
        ),

        React.createElement('main', { className: "flex-1 flex flex-col overflow-hidden" },
            React.createElement('header', { className: "bg-gray-800 shadow-md p-4 flex justify-between items-center" },
                 React.createElement('h1', { className: "text-2xl font-bold text-white" }, "Gestor de Alquileres Pro"),
                 activeView === 'properties' && React.createElement('button', {
                    onClick: () => setModal({ type: 'ADD_PROPERTY', data: null }),
                    className: "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
                  },
                  React.createElement(PlusIcon, { className: "h-5 w-5 mr-2" }),
                  "Nueva Propiedad"
                )
            ),
            React.createElement('div', { className: "flex-1 p-6 overflow-y-auto" },
                renderView()
            )
        ),
        
        renderModal(),
        
        isSaving && React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]" },
            React.createElement('div', {className: "text-white text-lg flex items-center"}, 
                React.createElement(Spinner, null),
                "Guardando..."
            )
        )
    );
};

export default App;