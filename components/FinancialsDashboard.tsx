import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../utils.js';
import { generateChargesForProperty } from '../utils.js';
import type { Property, Owner } from '../types.js';

export const FinancialsDashboard = ({ properties, owners }: { properties: Property[], owners: Owner[] }) => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    const monthlyData = useMemo(() => {
        const incomeByMonth: { [key: string]: number } = {};
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
            React.createElement('h3', { className: "text-xl font-bold text-white mb-4" }, "Distribución Mensual"),
            React.createElement('div', { className: "flex items-center space-x-4 mb-4" },
                React.createElement('label', { className: "text-gray-300" }, 
                    "Seleccionar Mes:",
                    React.createElement('input', { type: "month", value: selectedMonth, onChange: (e) => setSelectedMonth(e.target.value), className: "ml-2 bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" })
                )
            ),
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
            )
        )
    );
};