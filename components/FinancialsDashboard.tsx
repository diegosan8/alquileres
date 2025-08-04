import React, { useState, useMemo } from 'react';

const FinancialsDashboard = ({ properties, owners }) => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

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
            const allCharges = property.allCharges || [];
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

    // Helper functions for formatting
    const formatCurrency = (amount) => {
        return amount?.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h4 className="text-gray-400 text-sm font-medium">Activos Totales (Alquileres)</h4>
                    <p className="text-3xl font-bold text-white mt-1">{formatCurrency(totalAssets)}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h4 className="text-gray-400 text-sm font-medium">Deuda Total Pendiente</h4>
                    <p className="text-3xl font-bold text-red-400 mt-1">{formatCurrency(totalDebt)}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h4 className="text-gray-400 text-sm font-medium">Ingresos (Mes Seleccionado)</h4>
                    <p className="text-3xl font-bold text-green-400 mt-1">{formatCurrency(selectedMonthIncome)}</p>
                </div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-4">Distribución Mensual</h3>
                <div className="flex items-center space-x-4 mb-4">
                    <label className="text-gray-300">
                        Seleccionar Mes:
                        <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="ml-2 bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                    </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-lg font-semibold text-indigo-400 mb-2">Distribución para {selectedMonth}</h4>
                        <div className="space-y-2">
                            {ownerDistribution.map(owner => (
                                <div key={owner.id} className="flex justify-between p-2 bg-gray-700/50 rounded">
                                    <span className="text-gray-300">{owner.name} ({owner.percentage}%)</span>
                                    <span className="font-mono text-green-300">{formatCurrency(owner.share)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialsDashboard;
