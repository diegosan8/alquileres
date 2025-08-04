import React, { useMemo } from 'react';
import { PencilIcon, TrashIcon, CashIcon, TrendingUpIcon } from './Icons.js';
import { generateChargesForProperty, formatDate, formatCurrency } from '../utils.js';
import type { Property } from '../types.js';

export const PropertyCard = ({ property, onAddPayment, onEdit, onDelete, onUpdateRent }: { property: Property, onAddPayment: Function, onEdit: Function, onDelete: Function, onUpdateRent: Function }) => {
    const { allCharges, unpaidCharges, totalDebt, totalPaid } = useMemo(() => {
        const allCharges = generateChargesForProperty(property);
        const paidChargeIds = new Set(property.payments.flatMap(p => p.allocatedChargeIds));
        const unpaidCharges = allCharges.filter(c => !paidChargeIds.has(c.id));
        const totalDebt = unpaidCharges.reduce((sum, c) => sum + c.amount, 0);
        const totalPaid = property.payments.reduce((sum, p) => sum + p.amount, 0);
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
