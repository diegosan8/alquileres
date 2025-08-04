

import React, { useMemo } from 'react';

const formatCurrency = (amount) => amount?.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });

const PropertyCard = ({ property, onAddPayment, onViewAccount }) => {
    // Calcular saldo total (deuda pendiente)
    const totalDebt = useMemo(() => {
        if (!property.generateChargesForProperty) return 0;
        const allCharges = property.generateChargesForProperty(property);
        const paidChargeIds = new Set(property.payments.flatMap(p => p.allocatedChargeIds));
        const unpaidCharges = allCharges.filter(c => !paidChargeIds.has(c.id));
        return unpaidCharges.reduce((sum, c) => sum + c.amount, 0);
    }, [property]);

    // Calcular próxima actualización por inflación
    const nextUpdateDate = useMemo(() => {
        if (!property.contractStartDate || !property.updateFrequencyMonths) return null;
        const lastUpdate = property.valueHistory.length > 0
            ? new Date(Math.max(...property.valueHistory.map(vh => new Date(vh.date).getTime())))
            : new Date(property.contractStartDate);
        const next = new Date(lastUpdate);
        next.setMonth(next.getMonth() + property.updateFrequencyMonths);
        return next;
    }, [property]);

    return (
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col items-stretch min-w-[260px] max-w-xs mx-auto">
            <div className="mb-2">
                <h3 className="text-lg font-bold text-white truncate">{property.address}</h3>
                <p className="text-sm text-gray-400 truncate">Inquilino: {property.tenant.name}</p>
            </div>
            <div className="mb-2">
                <p className="text-xs text-gray-400">Próxima actualización por inflación:</p>
                <p className="text-sm text-yellow-300 font-semibold">
                    {nextUpdateDate ? nextUpdateDate.toLocaleDateString('es-AR') : 'N/A'}
                </p>
            </div>
            <div className="mb-4">
                <p className="text-xs text-gray-400">Saldo total:</p>
                <p className={`text-lg font-bold ${totalDebt > 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCurrency(totalDebt)}</p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-700 rounded-lg overflow-hidden border border-gray-700 bg-gray-900">
                <button
                    className="py-2 text-sm font-medium text-indigo-400 hover:bg-gray-800 transition"
                    onClick={() => onAddPayment(property.id)}
                >
                    Agregar Pago
                </button>
                <button
                    className="py-2 text-sm font-medium text-blue-400 hover:bg-gray-800 transition"
                    onClick={() => onViewAccount(property.id)}
                >
                    Ver cuenta corriente
                </button>
            </div>
        </div>
    );
};

export default PropertyCard;
