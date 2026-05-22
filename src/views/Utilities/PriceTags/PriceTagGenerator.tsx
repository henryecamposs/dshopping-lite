import React, { useState } from 'react';
import { useExchangeStore } from '../../../store/exchangeStore';
import { PriceTagGrid } from './PriceTagGrid';

export interface PriceTagData {
  id: string;
  name: string;
  sku: string;
  priceUSD: number;
}

export const PriceTagGenerator: React.FC = () => {
  const { currentRate } = useExchangeStore();
  const [tags, setTags] = useState<PriceTagData[]>([]);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [priceUSD, setPriceUSD] = useState<number | ''>('');

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || priceUSD === '') return;
    
    setTags([...tags, {
      id: Math.random().toString(36).substring(7),
      name,
      sku,
      priceUSD: Number(priceUSD)
    }]);
    
    // Reset form
    setName('');
    setSku('');
    setPriceUSD('');
  };

  const handleRemoveTag = (id: string) => {
    setTags(tags.filter(t => t.id !== id));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto print:p-0">
      {/* Ocultar UI en impresión */}
      <div className="print:hidden bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
        <h2 className="text-2xl font-bold mb-4">Generador de Habladores (Precios)</h2>
        <div className="bg-blue-50 p-3 rounded mb-6 text-blue-800">
            <strong>Tasa Vigente:</strong> Bs. {currentRate?.rate_value || '0.00'} 
            <span className="text-sm ml-2">(Usada para el cálculo en tiempo real)</span>
        </div>

        <form onSubmit={handleAddTag} className="flex gap-4 items-end mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Producto / Descripción</label>
            <input 
              type="text" required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
              value={name} onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700">SKU / Código</label>
            <input 
              type="text" 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
              value={sku} onChange={(e) => setSku(e.target.value)}
            />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700">Precio USD</label>
            <input 
              type="number" step="0.01" required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
              value={priceUSD} onChange={(e) => setPriceUSD(Number(e.target.value))}
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Agregar
          </button>
        </form>

        <div className="flex justify-between items-center bg-gray-100 p-3 rounded">
            <span><strong>{tags.length}</strong> etiquetas en cola.</span>
            {tags.length > 0 && (
                <div className="space-x-3">
                    <button onClick={() => setTags([])} className="text-red-600 hover:underline">Limpiar Todo</button>
                    <button onClick={handlePrint} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold">
                        🖨️ Imprimir Habladores
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* Grid de Impresión */}
      <PriceTagGrid tags={tags} currentRate={currentRate?.rate_value || 1} onRemove={handleRemoveTag} />
    </div>
  );
};
