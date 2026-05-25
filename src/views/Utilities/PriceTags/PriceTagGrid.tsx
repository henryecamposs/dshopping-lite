// dShopping Lite - Price Tag Grid & Print Styling Component
// Rejilla interactiva con previsualización premium en pantalla y maquetación doble columna en impresión
// Desarrollado por @Dev_React bajo la metodología SDD

import React from 'react';
import { PriceTagData } from './PriceTagGenerator';
import { Trash2, Sparkles } from 'lucide-react';

interface PriceTagGridProps {
  tags: PriceTagData[];
  currentRate: number;
  onRemove?: (id: string) => void;
  companyName: string;
}

export const PriceTagGrid: React.FC<PriceTagGridProps> = ({ tags, currentRate, onRemove, companyName }) => {
  if (tags.length === 0) return null;

  return (
    <div className="w-full">
      {/* 
        La hoja de impresión se estructura como un grid óptimo de 2 columnas.
        En pantalla se muestra responsivo con degradados elegantes HSL.
        En impresión se limpia para escala de grises de alta definición sin desperdiciar tinta.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 print:grid-cols-2 print:gap-4 gap-6">
        {tags.map((tag) => (
          <div 
            key={tag.id} 
            className="group relative overflow-hidden border border-border-main/60 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-indigo-950/10 dark:to-indigo-950/20 p-5 rounded-3xl flex flex-col justify-between h-[250px] shadow-sm hover:border-primary/40 hover:shadow-md transition-all duration-300 print:shadow-none print:bg-white print:border-4 print:border-double print:border-black print:rounded-none print:h-[290px] print:p-6"
          >
            {/* Adorno estético (Oculto en impresión) */}
            <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-2xl print:hidden"></div>

            {/* BOTÓN ELIMINAR (Oculto en impresión) */}
            <button 
              onClick={() => onRemove && onRemove(tag.id)}
              className="absolute top-3 right-3 p-1.5 text-rose-500 hover:text-rose-450 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer opacity-0 group-hover:opacity-100 print:hidden flex"
              title="Eliminar Etiqueta"
            >
              <Trash2 size={14} />
            </button>
            
            {/* SECCIÓN DESCRIPCIÓN */}
            <div className="text-center mt-3 print:mt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary rounded-full print:hidden">
                <Sparkles size={8} className="animate-spin" />
                CONVERSIÓN ACTIVA
              </span>
              
              <h3 className="text-xl print:text-2xl font-black text-text-main print:text-black uppercase tracking-tight leading-tight line-clamp-2 mt-2 print:mt-3">
                {tag.name}
              </h3>
              
              <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mt-1 print:text-xs print:text-gray-600">
                SKU: {tag.sku}
              </p>
            </div>

            {/* SECCIÓN PRECIO GRANDE */}
            <div className="text-center bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/25 rounded-2xl py-3 px-4 mt-auto print:bg-yellow-350 print:border-2 print:border-black print:rounded-lg">
              <p className="text-3xl print:text-4xl font-black text-amber-650 dark:text-amber-400 print:text-black font-mono leading-none">
                Bs. {(tag.priceUSD * currentRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              
              <p className="text-[11px] font-black mt-1 text-slate-500 dark:text-slate-400 print:text-sm print:text-black font-mono">
                Ref: ${tag.priceUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </p>
            </div>

            {/* MARCA DE EMPRESA IMPRESA (Oculta en pantalla, visible en papel) */}
            <div className="hidden print:flex items-center justify-between border-t border-gray-300 pt-2.5 mt-3 text-[9px] font-bold text-gray-500 uppercase tracking-widest font-sans">
              <span>{companyName}</span>
              <span>dShopping Lite</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

