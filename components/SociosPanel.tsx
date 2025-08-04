
import { useEffect, useState } from 'react';
import { getSocios, saveSocios, archiveAdelantos, getAdelantos } from '../services/sociosService';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';

const getCurrentYearMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const SociosPanel = () => {
  const [socios, setSocios] = useState([]);
  const [adelantos, setAdelantos] = useState([]); // [{amount, date}]
  const [editIdx, setEditIdx] = useState(-1);
  const [editValue, setEditValue] = useState(0);
  const [editDate, setEditDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [resetConfirm, setResetConfirm] = useState(false);

  // Cargar socios y adelantos actuales
  useEffect(() => {
    const fetchSocios = async () => {
      setLoading(true);
      const sociosDb = await getSocios();
      if (sociosDb.length === 0) {
        // Si no hay, inicializar
        const base = [1,2,3,4].map(i => ({ id: String(i), name: `Socio ${i}`, porcentaje: 25 }));
        await saveSocios(base);
        setSocios(base);
      } else {
        setSocios(sociosDb);
      }
      // Adelantos del mes actual
      const adelantosDb = await getAdelantos(getCurrentYearMonth());
      setAdelantos(adelantosDb.length === 0 ? sociosDb.map(s => ({ id: s.id, amount: 0, date: '' })) : adelantosDb);
      setLoading(false);
    };
    fetchSocios();
  }, []);

  // Calcular total alquileres del mes (sin TSG)
  const [alquileresMes, setAlquileresMes] = useState(0);
  useEffect(() => {
    const fetchAlquileres = async () => {
      const propsSnap = await getDocs(collection(db, 'properties'));
      const props = propsSnap.docs.map(doc => doc.data());
      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      let total = 0;
      props.forEach(p => {
        // Buscar el valor de alquiler vigente para este mes
        const vh = (p.valueHistory || []).filter(v => v.date <= ym).sort((a,b) => b.date.localeCompare(a.date))[0];
        if (vh) total += vh.rent;
      });
      setAlquileresMes(total);
    };
    fetchAlquileres();
  }, []);

  const handleNameChange = (idx, value) => {
    setSocios(prev => prev.map((s, i) => i === idx ? { ...s, name: value } : s));
  };
  const handlePorcentajeChange = (idx, value) => {
    setSocios(prev => prev.map((s, i) => i === idx ? { ...s, porcentaje: parseFloat(value) || 0 } : s));
  };
  const handleSaveSocios = async () => {
    await saveSocios(socios);
    alert('Socios actualizados');
  };

  const handleAdelantoChange = (idx, value) => {
    setAdelantos(prev => prev.map((a, i) => i === idx ? { ...a, amount: parseFloat(value) || 0, date: new Date().toISOString().slice(0,10) } : a));
  };
  const handleCargarAdelanto = async (idx) => {
    // Guardar adelanto en memoria y en Firestore
    const nuevos = adelantos.map((a, i) => i === idx ? { ...a, date: new Date().toISOString().slice(0,10) } : a);
    setAdelantos(nuevos);
    await archiveAdelantos(nuevos, getCurrentYearMonth());
  };
  const handleEditAdelanto = (idx) => {
    setEditIdx(idx);
    setEditValue(adelantos[idx].amount);
    setEditDate(adelantos[idx].date || new Date().toISOString().slice(0,10));
  };
  const handleSaveEditAdelanto = async () => {
    const nuevos = adelantos.map((a, i) => i === editIdx ? { ...a, amount: parseFloat(editValue) || 0, date: editDate } : a);
    setAdelantos(nuevos);
    await archiveAdelantos(nuevos, getCurrentYearMonth());
    setEditIdx(-1);
  };
  const handleReset = async () => {
    setResetConfirm(false);
    // Archivar adelantos actuales
    await archiveAdelantos(adelantos, getCurrentYearMonth());
    // Resetear adelantos
    const vacios = socios.map(s => ({ id: s.id, amount: 0, date: '' }));
    setAdelantos(vacios);
    await archiveAdelantos(vacios, getCurrentYearMonth());
  };

  if (loading) return <div className="text-white">Cargando...</div>;

  return (
    <div className="max-w-5xl mx-auto mt-8">
      <h3 className="text-2xl font-bold text-white mb-6 text-center">Distribución de Socios</h3>
      <div className="flex flex-wrap gap-6 justify-center mb-8">
        {socios.map((socio, idx) => {
          const monto = alquileresMes * (socio.porcentaje / 100);
          const adelanto = adelantos[idx]?.amount || 0;
          const saldo = monto - adelanto;
          return (
            <div key={socio.id} className="bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col items-stretch min-w-[260px] max-w-xs mx-auto relative border border-gray-700">
              <div className="mb-2">
                <input className="bg-gray-700 text-white rounded px-2 py-1 mb-1 text-center font-bold w-full" value={socio.name} onChange={e => handleNameChange(idx, e.target.value)} />
                <div className="flex items-center justify-between mt-1">
                  <input type="number" className="bg-gray-700 text-white rounded px-2 py-1 w-16 text-center" value={socio.porcentaje} min={0} max={100} onChange={e => handlePorcentajeChange(idx, e.target.value)} />
                  <span className="text-xs text-gray-400 ml-2">% participación</span>
                </div>
              </div>
              <div className="mb-2">
                <p className="text-xs text-gray-400">Alquiler mes:</p>
                <p className="text-base text-green-300 font-semibold">${monto.toFixed(2)}</p>
              </div>
              <div className="mb-2">
                <p className="text-xs text-gray-400">Adelanto:</p>
                <p className="text-base text-yellow-300 font-mono">${adelanto.toFixed(2)}</p>
              </div>
              <div className="mb-4">
                <p className="text-xs text-gray-400">Saldo:</p>
                <p className={`text-lg font-bold ${saldo < 0 ? 'text-red-400' : 'text-green-400'}`}>${saldo.toFixed(2)}</p>
              </div>
              {editIdx === idx ? (
                <div className="mt-2 flex flex-col items-center gap-1">
                  <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="bg-gray-700 text-white rounded px-2 py-1 w-20 mb-1" />
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="bg-gray-700 text-white rounded px-2 py-1 w-32 mb-1" />
                  <button onClick={handleSaveEditAdelanto} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded mb-1 w-full">Guardar</button>
                  <button onClick={() => setEditIdx(-1)} className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded w-full">Cancelar</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button onClick={() => handleCargarAdelanto(idx)} className="py-2 text-sm font-medium text-indigo-400 hover:bg-gray-800 transition rounded border border-indigo-500">ADELANTAR PAGO</button>
                  <button onClick={() => handleEditAdelanto(idx)} className="py-2 text-sm font-medium text-yellow-400 hover:bg-gray-800 transition rounded border border-yellow-500">Editar Adelanto</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 justify-center mt-6">
        <button onClick={handleSaveSocios} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow">Guardar Socios</button>
        <button onClick={() => setResetConfirm(true)} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded shadow">RESET MES</button>
      </div>
      {resetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg shadow-lg flex flex-col items-center">
            <div className="text-white mb-4">¿Seguro que quieres archivar y resetear los adelantos del mes?</div>
            <div className="flex gap-4">
              <button onClick={handleReset} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded">Sí, resetear</button>
              <button onClick={() => setResetConfirm(false)} className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SociosPanel;
