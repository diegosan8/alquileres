import React, { useMemo, useState } from 'react';

// Helper para formatear moneda
const formatCurrency = (amount: number) => amount?.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });

// Helper para formatear mes-año
const formatMonthYear = (date: Date) => date.toLocaleString('es-AR', { month: 'long', year: 'numeric' });

const AccountView = ({ property, inflationData, onUpdateRent, onBack }) => {
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

    // Estado para el modal de actualización
    const [showUpdate, setShowUpdate] = useState(false);
    const [suggestedRent, setSuggestedRent] = useState<number | null>(null);
    const [suggestedTax, setSuggestedTax] = useState<number | null>(null);
    const [vigencia, setVigencia] = useState<string>("");

    // Calcular sugerencia al abrir el modal
    const handleOpenUpdate = () => {
        // Buscar última actualización
        const lastUpdate = property.valueHistory.length > 0
            ? property.valueHistory[property.valueHistory.length - 1]
            : { date: property.contractStartDate, rent: property.rent, tax: property.tax };
        // Determinar desde qué mes sumar inflación
        const lastDate = new Date(lastUpdate.date);
        const months = property.updateFrequencyMonths;
        const inflations = [];
        for (let i = 1; i <= months; i++) {
            const d = new Date(lastDate);
            d.setMonth(d.getMonth() + i);
            const ym = d.toISOString().slice(0, 7);
            const rec = inflationData.find(r => r.id === ym);
            if (rec) inflations.push(rec.rate);
        }
        // Inflación acumulada
        const factor = inflations.reduce((acc, rate) => acc * (1 + rate / 100), 1);
        setSuggestedRent(Number((lastUpdate.rent * factor).toFixed(2)));
        setSuggestedTax(Number((lastUpdate.tax * factor).toFixed(2)));
        // Fecha de vigencia: primer día del próximo mes
        const next = new Date();
        next.setMonth(next.getMonth() + 1);
        setVigencia(next.toISOString().slice(0, 10));
        setShowUpdate(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (suggestedRent == null || !vigencia) return;
        onUpdateRent({
            date: vigencia,
            rent: suggestedRent,
            tax: suggestedTax ?? 0,
        });
        setShowUpdate(false);
    };

    return (
        <div className="max-w-lg mx-auto bg-gray-800 rounded-xl shadow-lg p-6 mt-6">
            <button onClick={onBack} className="mb-4 text-indigo-400 hover:underline">&larr; Volver</button>
            <h2 className="text-xl font-bold text-white mb-2">Cuenta Corriente</h2>
            <div className="mb-2">
                <span className="text-gray-400">Dirección:</span> <span className="text-white font-semibold">{property.address}</span>
            </div>
            <div className="mb-2">
                <span className="text-gray-400">Inquilino:</span> <span className="text-white">{property.tenant.name}</span>
            </div>
            <div className="mb-2">
                <span className="text-gray-400">Próxima actualización por inflación:</span> <span className="text-yellow-300 font-semibold">{nextUpdateDate ? formatMonthYear(nextUpdateDate) : 'N/A'}</span>
            </div>
            <div className="mb-6">
                <button onClick={handleOpenUpdate} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Actualizar por inflación</button>
            </div>
            {showUpdate && (
                <form onSubmit={handleSubmit} className="bg-gray-900 p-4 rounded-lg space-y-4">
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">Nuevo alquiler sugerido ($)</label>
                        <input type="number" value={suggestedRent ?? ''} onChange={e => setSuggestedRent(Number(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" required />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">Nuevo TSG sugerido ($)</label>
                        <input type="number" value={suggestedTax ?? ''} onChange={e => setSuggestedTax(Number(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">Fecha de entrada en vigencia</label>
                        <input type="date" value={vigencia} onChange={e => setVigencia(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" required />
                    </div>
                    <div className="flex justify-end space-x-4">
                        <button type="button" onClick={() => setShowUpdate(false)} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500">Cancelar</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Actualizar</button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default AccountView;
