// dShopping Lite - Generador de Habladores (Price Tag Generator)
// Interfaz premium con glassmorphism, cola interactiva y modal de impresión
// Desarrollado por @Dev_React bajo la metodología SDD

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { useExchangeStore } from '../../../store/exchangeStore';
import { PriceTagGrid } from './PriceTagGrid';
import { 
  Tags, 
  Plus, 
  Trash2, 
  Printer, 
  TrendingUp, 
  X, 
  Save, 
  FileText,
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';
import Swal from 'sweetalert2';

export interface PriceTagData {
  id: string;
  name: string;
  sku: string;
  priceUSD: number;
}

export const PriceTagGenerator: React.FC = () => {
  const { company } = useAuthStore();
  const { currentRate, fetchCurrentRate } = useExchangeStore();
  const [tags, setTags] = useState<PriceTagData[]>([]);
  
  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [priceUSD, setPriceUSD] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (company?.id) {
      fetchCurrentRate(company.id);
    }
  }, [company?.id, fetchCurrentRate]);

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('La descripción del producto es obligatoria.');
      return;
    }

    const numPrice = parseFloat(priceUSD);
    if (isNaN(numPrice) || numPrice <= 0) {
      setError('Debe ingresar un precio en USD válido y mayor a cero.');
      return;
    }
    
    setTags([...tags, {
      id: Math.random().toString(36).substring(7),
      name: name.trim(),
      sku: sku.trim().toUpperCase() || 'S/N',
      priceUSD: numPrice
    }]);
    
    // Reset form
    setName('');
    setSku('');
    setPriceUSD('');
    
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Producto añadido a la cola.',
      showConfirmButton: false,
      timer: 1500,
      background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
    });
  };

  const handleRemoveTag = (id: string) => {
    setTags(tags.filter(t => t.id !== id));
  };

  const handleClearAll = () => {
    Swal.fire({
      title: '¿Limpiar cola de impresión?',
      text: 'Se eliminarán todas las etiquetas agregadas actualmente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#4b5563',
      background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
    }).then((result) => {
      if (result.isConfirmed) {
        setTags([]);
      }
    });
  };

  const handlePrint = () => {
    if (tags.length === 0) return;
    
    Swal.fire({
      title: '🖨️ Recomendación de Impresión',
      html: `<div class="text-left text-sm space-y-2 leading-relaxed">
              <p>Para obtener un formato de habladores impecable y profesional en papel, te sugerimos ajustar los siguientes valores en la ventana de impresión de tu navegador:</p>
              <ul class="list-disc pl-5 font-semibold space-y-1">
                <li><strong>Orientación:</strong> Horizontal (Landscape).</li>
                <li><strong>Márgenes:</strong> Ninguno (Mínimo).</li>
                <li><strong>Gráficos de fondo:</strong> Activos (Permite ver el diseño y colores).</li>
              </ul>
             </div>`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Abrir Panel de Impresión',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#8b5cf6',
      cancelButtonColor: '#4b5563',
      background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
    }).then((result) => {
      if (result.isConfirmed) {
        window.print();
      }
    });
  };

  const rateValue = currentRate?.rate_value || 45.0;

  return (
    <div className="space-y-6 print-container">
      {/* CABECERA (Pantalla) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight flex items-center gap-2">
            <Tags className="text-primary animate-pulse" />
            Generador de Habladores
          </h2>
          <p className="text-muted-foreground text-sm">Diseñe y mande a impresión etiquetas de precio premium convertidas en caliente con la tasa del día.</p>
        </div>
        
        {tags.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleClearAll}
              className="btn-secondary text-xs border-rose-500/10 text-rose-500 hover:bg-rose-500/5 hover:border-rose-500/25 cursor-pointer"
            >
              Limpiar Todo
            </button>
            <button
              onClick={handlePrint}
              className="btn-primary text-xs flex items-center gap-2 cursor-pointer"
            >
              <Printer size={16} />
              Imprimir Habladores
            </button>
          </div>
        )}
      </div>

      {/* DETALLES DE TASA VIGENTE (Pantalla) */}
      <div className="bg-primary/5 dark:bg-primary/10 border border-primary/15 dark:border-primary/25 rounded-2xl p-4 no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-emerald-500" size={20} />
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tasa Cambiaria del Día</p>
            <p className="text-sm font-semibold text-text-main">
              Se utilizará la tasa activa de <span className="font-mono font-black text-emerald-555 dark:text-emerald-450">{rateValue.toFixed(2)} Bs/$</span> para la conversión automática en caliente.
            </p>
          </div>
        </div>
        <div className="text-xs bg-indigo-500/10 text-primary font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <Sparkles size={13} />
          Habladores Premium Activos
        </div>
      </div>

      {/* FORMULARIO DE ALTA (Pantalla) */}
      <div className="glass-card rounded-3xl p-6 no-print border border-border-main/60 max-w-4xl shadow-sm">
        <h3 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
          <Plus className="text-primary" size={18} />
          Agregar Producto a la Cola
        </h3>

        {error && (
          <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-semibold mb-4">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAddTag} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Producto / Descripción</label>
            <input 
              type="text" 
              required
              className="input-premium w-full text-sm"
              placeholder="Ej. Harina de Maíz Pan 1Kg"
              value={name} 
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">SKU / Código</label>
            <input 
              type="text" 
              className="input-premium w-full text-sm font-mono"
              placeholder="Ej. HMP01"
              value={sku} 
              onChange={(e) => setSku(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Precio USD ($)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-muted-foreground font-bold font-mono">$</span>
              <input 
                type="number" 
                step="0.01" 
                required
                className="input-premium w-full pl-8 text-sm font-bold font-mono"
                placeholder="0.00"
                value={priceUSD} 
                onChange={(e) => setPriceUSD(e.target.value)}
              />
            </div>
          </div>

          {priceUSD && (
            <div className="sm:col-span-4 bg-muted/10 border border-border-main p-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in duration-200">
              <span className="text-muted-foreground uppercase">Monto Equivalente en Bolívares:</span>
              <span className="text-emerald-555 dark:text-emerald-450 font-mono text-sm font-black">
                Bs. {(parseFloat(priceUSD || '0') * rateValue).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="sm:col-span-4 flex justify-end pt-2">
            <button 
              type="submit" 
              className="btn-primary text-xs py-2.5 px-6 flex items-center gap-2 cursor-pointer font-bold"
            >
              <Plus size={14} />
              Agregar a la Cola
            </button>
          </div>
        </form>
      </div>

      {/* COLA DE IMPRESIÓN (Pantalla) */}
      <div className="space-y-4 no-print">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <FileText size={16} />
          Cola de Etiquetas ({tags.length})
        </h3>
        
        {tags.length === 0 && (
          <div className="p-12 text-center bg-muted/20 border border-border-main/50 border-dashed rounded-3xl">
            <Tags className="mx-auto text-muted-foreground mb-2" size={40} />
            <p className="text-muted-foreground text-sm font-bold">No hay etiquetas agregadas en la cola.</p>
            <p className="text-slate-400 text-xs mt-1">Rellene el formulario superior para crear e imprimir habladores.</p>
          </div>
        )}
      </div>

      {/* GRID DE HABLADORES (Previsualización y Grid de Impresión) */}
      <PriceTagGrid 
        tags={tags} 
        currentRate={rateValue} 
        onRemove={handleRemoveTag} 
        companyName={company?.name || 'dShopping Lite'}
      />
    </div>
  );
};
