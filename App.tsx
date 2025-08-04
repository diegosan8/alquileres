





import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HomeIcon, PlusIcon, UsersIcon, ChartPieIcon, TrendingUpIcon, CashIcon } from './components/Icons.js';
import { db, storage, firebaseError } from './services/firebase.js';
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import PropertyForm from './components/PropertyForm';
import PaymentForm from './components/PaymentForm';
import OwnersPanel from './components/OwnersPanel';
import SociosPanel from './components/SociosPanel';
import InflationPanel from './components/InflationPanel';
import PropertyCard from './components/PropertyCard';
import AccountView from './components/AccountView';
import Modal from './components/Modal';
import Spinner from './components/Spinner';
import FirebaseErrorView from './components/FirebaseErrorView';


// --- Type Definitions (inline, as types.ts is empty) ---
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
    contractFile?: ContractFile | File | null;
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
const generateChargesForProperty = (property) => {
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
        const applicableValues = sortedHistory.filter(v => v.date <= chargeDateStr);
        const lastValue = applicableValues.length > 0 ? applicableValues[applicableValues.length - 1] : sortedHistory[0];
        // Cargo de alquiler
        charges.push({
            id: `${property.id}_${chargeDateStr}_alquiler`,
            date: chargeDateStr,
            amount: lastValue.rent,
            description: 'Alquiler',
            type: 'alquiler',
        });
        // Cargo de TSG
        charges.push({
            id: `${property.id}_${chargeDateStr}_tsg`,
            date: chargeDateStr,
            amount: lastValue.tax,
            description: 'TSG',
            type: 'tsg',
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    return charges;
};

import FinancialsDashboard from './components/FinancialsDashboard';
import RentUpdateForm from './components/RentUpdateForm';

// ...existing code...
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
    const [activeView, setActiveView] = useState('dashboard'); // dashboard, properties, owners, inflation, account
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [modal, setModal] = useState<{ type: string | null; data: any }>({ type: null, data: null });
    const [isSaving, setIsSaving] = useState(false);



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
                return React.createElement(FinancialsDashboard, { properties, owners });
            case 'properties':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {properties.map(p => (
                            <div key={p.id}>
                                <PropertyCard
                                    property={{
                                        ...p,
                                        generateChargesForProperty,
                                    }}
                                    onAddPayment={(propertyId) => {
                                        const allCharges = generateChargesForProperty(p);
                                        const paidChargeIds = new Set(p.payments.flatMap(pay => pay.allocatedChargeIds));
                                        const unpaidCharges = allCharges.filter(c => !paidChargeIds.has(c.id));
                                        setModal({ type: 'ADD_PAYMENT', data: { propertyId, unpaidCharges } });
                                    }}
                                    onViewAccount={() => {
                                        setSelectedProperty(p);
                                        setActiveView('account');
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                );
            case 'account':
                return selectedProperty && (
                    <AccountView
                        property={selectedProperty}
                        inflationData={inflationData}
                        onUpdateRent={(newValues) => handleUpdateRent(selectedProperty.id, newValues)}
                        onBack={() => setActiveView('properties')}
                    />
                );
            case 'owners':
                return React.createElement(OwnersPanel, { owners, onSave: handleSaveOwners });
            case 'socios':
                return React.createElement(SociosPanel, {});
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
                React.createElement(NavItem, { icon: UsersIcon, label: "Socios", viewName: "socios" }),
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