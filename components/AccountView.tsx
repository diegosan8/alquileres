
import React, { useMemo, useState } from 'react';

const formatCurrency = (amount: number) => amount?.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });
const formatMonthYear = (date: Date) => date.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
const formatDate = (date: string) => new Date(date).toLocaleDateString('es-AR');

const AccountView = ({ property, inflationData, onUpdateRent, onBack }) => {
    // Advertencia de vencimiento de contrato
    let contractWarning = null;
    if (property.contractStartDate && property.contractDurationMonths) {
        const start = new Date(property.contractStartDate);
        const end = new Date(start);
        end.setMonth(end.getMonth() + Number(property.contractDurationMonths));
        const now = new Date();
        const diffMonths = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
        if (diffMonths <= 2) {
            contractWarning = `¡Atención! El contrato vence el ${end.toLocaleDateString('es-AR')}${diffMonths < 0 ? ' (ya vencido)' : diffMonths === 0 ? ' (vence este mes)' : diffMonths === 1 ? ' (vence el mes que viene)' : ' (faltan 2 meses)'}.`;
        }
    }
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

    // Nueva tabla: una línea por mes desde el inicio del contrato, con ALQUILER, TSG y pagos en el mes
    const [editIdx, setEditIdx] = useState(-1);
    const [editMov, setEditMov] = useState(null);
    // Generar meses desde inicio de contrato hasta hoy
    const getMonthsArray = (startDate, endDate) => {
        const arr = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setDate(1);
        end.setDate(1);
        while (start <= end) {
            arr.push(start.toISOString().slice(0, 7));
            start.setMonth(start.getMonth() + 1);
        }
        return arr;
    };
    const today = new Date();
    const monthsArr = property.contractStartDate ? getMonthsArray(property.contractStartDate, today) : [];
    // Agrupar pagos por mes
    const pagosPorMes = {};
    (property.payments || []).forEach(p => {
        const ym = p.date.slice(0, 7);
        if (!pagosPorMes[ym]) pagosPorMes[ym] = [];
        pagosPorMes[ym].push(p);
    });
    // Para cada mes, buscar valor de alquiler y tsg vigente y asegurar que SIEMPRE se agregue el débito mensual
    let saldo = 0;
    const movimientosConSaldo = [];
    monthsArr.forEach((ym, idx) => {
        // Buscar valor vigente
        const vh = (property.valueHistory || []).filter(v => v.date <= ym).sort((a,b) => b.date.localeCompare(a.date))[0];
        const alquiler = vh ? vh.rent : property.rent;
        const tsg = vh ? vh.tax : property.tax;
        // ALQUILER
        movimientosConSaldo.push({
            idx: movimientosConSaldo.length,
            fecha: ym + '-01',
            detalle: 'ALQUILER',
            debe: alquiler,
            haber: 0,
            saldo: saldo - alquiler,
            tipo: 'alquiler',
            id: `alquiler_${ym}`
        });
        saldo -= alquiler;
        // TSG
        movimientosConSaldo.push({
            idx: movimientosConSaldo.length,
            fecha: ym + '-01',
            detalle: 'TSG',
            debe: tsg,
            haber: 0,
            saldo: saldo - tsg,
            tipo: 'tsg',
            id: `tsg_${ym}`
        });
        saldo -= tsg;
        // PAGOS
        (pagosPorMes[ym] || []).forEach(p => {
            movimientosConSaldo.push({
                idx: movimientosConSaldo.length,
                fecha: p.date,
                detalle: p.notes || 'Pago',
                debe: 0,
                haber: p.amount,
                saldo: saldo + p.amount,
                tipo: 'pago',
                id: `pago_${p.id}`
            });
            saldo += p.amount;
        });
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
            {contractWarning && (
                <div className="mb-4 p-3 bg-yellow-200 text-yellow-900 rounded font-bold text-center animate-pulse">
                    {contractWarning}
                </div>
            )}
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
                                            {(() => {
                                                // Mostrar fecha real (YYYY-MM-DD) para todos los movimientos
                                                return formatDate(mov.fecha);
                                            })()}
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
            <div className="flex justify-end mt-6">
                <EliminarPropiedadButton property={property} onBack={onBack} />
            </div>
        </div>
    );

// Botón de eliminar propiedad con doble confirmación
function EliminarPropiedadButton({ property, onBack }) {
    const [confirm1, setConfirm1] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const handleDelete = async () => {
        setDeleting(true);
        try {
            // Eliminar propiedad usando la función global (window.handleDeleteProperty)
            if (window.handleDeleteProperty) {
                await window.handleDeleteProperty(property);
            }
            onBack();
        } catch (e) {
            alert('Error al eliminar la propiedad');
        } finally {
            setDeleting(false);
        }
    };
    if (!confirm1) {
        return <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded" onClick={() => setConfirm1(true)}>Eliminar Propiedad</button>;
    }
    return (
        <div className="flex flex-col items-end gap-2">
            <div className="bg-gray-900 p-4 rounded shadow text-white mb-2">
                <div>¿Seguro que quieres eliminar la propiedad?</div>
                <div className="mt-2">Escribe <b>SI</b> para confirmar:</div>
                <input className="bg-gray-700 text-white rounded px-2 py-1 mt-2" value={confirmText} onChange={e => setConfirmText(e.target.value)} />
                <div className="flex gap-2 mt-3">
                    <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded" disabled={confirmText !== 'SI' || deleting} onClick={handleDelete}>Eliminar</button>
                    <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-1 rounded" onClick={() => setConfirm1(false)}>Cancelar</button>
                </div>
            </div>
        </div>
    );
}
};

export default AccountView;
