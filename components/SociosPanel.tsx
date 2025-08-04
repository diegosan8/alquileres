import React, { useState } from 'react';

const defaultSocios = [
  { name: 'Socio 1', porcentaje: 25, saldo: 0 },
  { name: 'Socio 2', porcentaje: 25, saldo: 0 },
  { name: 'Socio 3', porcentaje: 25, saldo: 0 },
  { name: 'Socio 4', porcentaje: 25, saldo: 0 },
];

const SociosPanel = () => {
  const [socios, setSocios] = useState(defaultSocios);
  const [adelantos, setAdelantos] = useState([0, 0, 0, 0]);

  const handleNameChange = (idx, value) => {
    setSocios(prev => prev.map((s, i) => i === idx ? { ...s, name: value } : s));
  };

  const handlePorcentajeChange = (idx, value) => {
    setSocios(prev => prev.map((s, i) => i === idx ? { ...s, porcentaje: parseFloat(value) || 0 } : s));
  };

  const handleAdelantoChange = (idx, value) => {
    setAdelantos(prev => prev.map((a, i) => i === idx ? parseFloat(value) || 0 : a));
  };

  const handleCargarAdelanto = (idx) => {
    setSocios(prev => prev.map((s, i) => i === idx ? { ...s, saldo: s.saldo + adelantos[idx] } : s));
    setAdelantos(prev => prev.map((a, i) => i === idx ? 0 : a));
  };

  const handleReset = () => {
    setSocios(prev => prev.map(s => ({ ...s, saldo: 0 })));
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg max-w-3xl mx-auto mt-8">
      <h3 className="text-xl font-bold text-white mb-4">Gestión de Socios</h3>
      <table className="min-w-full bg-gray-700 rounded-md mb-4">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left text-gray-300">Nombre</th>
            <th className="px-4 py-2 text-left text-gray-300">%</th>
            <th className="px-4 py-2 text-left text-gray-300">Saldo</th>
            <th className="px-4 py-2 text-left text-gray-300">Adelanto</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {socios.map((socio, idx) => (
            <tr key={idx} className="border-b border-gray-600">
              <td className="px-4 py-2">
                <input
                  className="bg-gray-600 text-white rounded px-2 py-1 w-32"
                  value={socio.name}
                  onChange={e => handleNameChange(idx, e.target.value)}
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  className="bg-gray-600 text-white rounded px-2 py-1 w-16"
                  value={socio.porcentaje}
                  min={0}
                  max={100}
                  onChange={e => handlePorcentajeChange(idx, e.target.value)}
                />
              </td>
              <td className="px-4 py-2 text-right text-green-300 font-mono">${socio.saldo.toFixed(2)}</td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  className="bg-gray-600 text-white rounded px-2 py-1 w-20"
                  value={adelantos[idx]}
                  onChange={e => handleAdelantoChange(idx, e.target.value)}
                />
              </td>
              <td className="px-4 py-2">
                <button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded"
                  onClick={() => handleCargarAdelanto(idx)}
                  disabled={adelantos[idx] === 0}
                >
                  Cargar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-end">
        <button
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded"
          onClick={handleReset}
        >
          RESET SALDOS
        </button>
      </div>
    </div>
  );
};

export default SociosPanel;
