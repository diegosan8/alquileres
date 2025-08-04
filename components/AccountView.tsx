
import React, { useMemo, useState } from 'react';

const formatCurrency = (amount: number) => amount?.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });
const formatMonthYear = (date: Date) => date.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
const formatDate = (date: string) => new Date(date).toLocaleDateString('es-AR');

const AccountView = ({ property, inflationData, onUpdateRent, onBack }) => {
    const nextUpdateDate = useMemo(() => {
        if (!property.contractStartDate || !property.updateFrequencyMonths) return null;
        const lastUpdate = property.valueHistory.length > 0
            ? new Date(Math.max(...property.valueHistory.map(vh => new Date(vh.date).getTime())))
            : new Date(property.contractStartDate);
        const next = new Date(lastUpdate);
        next.setMonth(next.getMonth() + property.updateFrequencyMonths);
        return next;
    }, [property]);

    const [showUpdate, setShowUpdate] = useState(false);
    const [suggestedRent, setSuggestedRent] = useState<number | null>(null);
    const [suggestedTax, setSuggestedTax] = useState<number | null>(null);
    const [vigencia, setVigencia] = useState<string>("");

    const handleOpenUpdate = () => {
        const lastUpdate = property.valueHistory.length > 0
            ? property.valueHistory[property.valueHistory.length - 1]
            : { date: property.contractStartDate, rent: property.rent, tax: property.tax };
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
        const factor = inflations.reduce((acc, rate) => acc * (1 + rate / 100), 1);
        setSuggestedRent(Number((lastUpdate.rent * factor).toFixed(2)));
        setSuggestedTax(Number((lastUpdate.tax * factor).toFixed(2)));
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

    // Movimientos: cargos (alquiler+tsg) y pagos
    const movimientos = useMemo(() => {
        // Cargos: uno por cada mes generado
        const charges = property.generateChargesForProperty ? property.generateChargesForProperty(property) : [];
        // Pagos
        const pagos = property.payments || [];
        // Unir y ordenar por fecha
        const items = [
            ...charges.map(c => ({
                tipo: 'cargo',
                fecha: c.date,
                detalle: c.description,
                debe: c.amount,
                haber: 0,
                id: 'cargo_' + c.id,
            })),
            ...pagos.map(p => ({
                tipo: 'pago',
                fecha: p.date,
                detalle: p.notes || 'Pago',
                debe: 0,
                haber: p.amount,
                id: 'pago_' + p.id,
            })),
        ];
        // Ordenar por fecha (cargos primero si misma fecha)
        items.sort((a, b) => {
            if (a.fecha === b.fecha) return a.tipo === 'cargo' ? -1 : 1;
            return a.fecha.localeCompare(b.fecha);
        });
        return items;
    }, [property]);

    // Calcular saldo progresivo
    const [editIdx, setEditIdx] = useState(-1);
    const [editMov, setEditMov] = useState(null);
    let saldo = 0;
    const movimientosConSaldo = movimientos.map((mov, idx) => {
        saldo += mov.haber - mov.debe;
        return { ...mov, saldo: saldo, idx };
    });

    const handleEdit = (mov) => {
        setEditIdx(mov.idx);
        setEditMov({ ...mov });
    };
    const handleEditChange = (field, value) => {
        setEditMov(prev => ({ ...prev, [field]: value }));
    };
    const handleEditSave = () => {
        // Aquí deberías actualizar el movimiento en la base de datos o en el estado global
        // Por ahora solo actualiza en el array local (ejemplo)
        if (editMov.tipo === 'cargo') {
            const chargeIdx = property.charges.findIndex(c => 'cargo_' + c.id === editMov.id);
            if (chargeIdx !== -1) {
                property.charges[chargeIdx].date = editMov.fecha;
                property.charges[chargeIdx].description = editMov.detalle;
                property.charges[chargeIdx].amount = Number(editMov.debe);
            }
        } else if (editMov.tipo === 'pago') {
            const payIdx = property.payments.findIndex(p => 'pago_' + p.id === editMov.id);
            if (payIdx !== -1) {
                property.payments[payIdx].date = editMov.fecha;
                property.payments[payIdx].notes = editMov.detalle;
                property.payments[payIdx].amount = Number(editMov.haber);
            }
        }
        setEditIdx(-1);
        setEditMov(null);
    };
    const handleEditCancel = () => {
        setEditIdx(-1);
        setEditMov(null);
    };

    return (
        <div className="max-w-2xl mx-auto bg-gray-800 rounded-xl shadow-lg p-6 mt-6">
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
                <form onSubmit={handleSubmit} className="bg-gray-900 p-4 rounded-lg space-y-4 mb-6">
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
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-gray-200 border border-gray-700 rounded-lg">
                    <thead>
                        <tr className="bg-gray-900">
                            <th className="px-2 py-2">FECHA</th>
                            <th className="px-2 py-2">DETALLE</th>
                            <th className="px-2 py-2">DEBE</th>
                            <th className="px-2 py-2">HABER</th>
                            <th className="px-2 py-2">SALDO</th>
                            <th className="px-2 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {movimientosConSaldo.map(mov => (
                            <tr key={mov.id} className="border-b border-gray-700">
                                {editIdx === mov.idx ? (
                                    <>
                                        <td className="px-2 py-1">
                                            <input type="date" value={editMov.fecha} onChange={e => handleEditChange('fecha', e.target.value)} className="bg-gray-700 text-white rounded px-1 py-1 w-32" />
                                        </td>
                                        <td className="px-2 py-1">
                                            <input type="text" value={editMov.detalle} onChange={e => handleEditChange('detalle', e.target.value)} className="bg-gray-700 text-white rounded px-1 py-1 w-32" />
                                        </td>
                                        <td className="px-2 py-1">
                                            <input type="number" value={editMov.debe} onChange={e => handleEditChange('debe', e.target.value)} className="bg-gray-700 text-white rounded px-1 py-1 w-20" />
                                        </td>
                                        <td className="px-2 py-1">
                                            <input type="number" value={editMov.haber} onChange={e => handleEditChange('haber', e.target.value)} className="bg-gray-700 text-white rounded px-1 py-1 w-20" />
                                        </td>
                                        <td className="px-2 py-1 font-mono">{formatCurrency(editMov.saldo)}</td>
                                        <td className="px-2 py-1">
                                            <button onClick={handleEditSave} className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded mr-1">Guardar</button>
                                            <button onClick={handleEditCancel} className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded">Cancelar</button>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-2 py-1">
                                            {mov.tipo === 'cargo'
                                                ? (() => { const d = new Date(mov.fecha); return d.toLocaleString('es-AR', { month: 'long', year: 'numeric' }); })()
                                                : formatDate(mov.fecha)}
                                        </td>
                                        <td className="px-2 py-1">{mov.detalle}</td>
                                        <td className="px-2 py-1 text-red-300">{mov.debe ? formatCurrency(mov.debe) : ''}</td>
                                        <td className="px-2 py-1 text-green-300">{mov.haber ? formatCurrency(mov.haber) : ''}</td>
                                        <td className="px-2 py-1 font-mono">{formatCurrency(mov.saldo)}</td>
                                        <td className="px-2 py-1">
                                            <button onClick={() => handleEdit(mov)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded">Editar</button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AccountView;
