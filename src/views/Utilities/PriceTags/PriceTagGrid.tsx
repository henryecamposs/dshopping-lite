import React from 'react';
import { PriceTagData } from './PriceTagGenerator';

interface PriceTagGridProps {
  tags: PriceTagData[];
  currentRate: number;
  onRemove?: (id: string) => void;
}

export const PriceTagGrid: React.FC<PriceTagGridProps> = ({ tags, currentRate, onRemove }) => {
  if (tags.length === 0) return null;

  return (
    <div className="w-full">
      {/* 
        La hoja de impresión se estructura como un grid. 
        En modo 'print', usamos grid-cols-2 (2x4 = 8 por página aprox) 
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-2 print:gap-1 gap-4">
        {tags.map((tag) => (
          <div key={tag.id} className="relative border-4 border-black p-4 rounded-xl shadow-sm print:shadow-none bg-white flex flex-col justify-between h-[200px] print:h-[250px] print:rounded-none">
            {/* Botón de eliminar (oculto en impresión) */}
            <button 
              onClick={() => onRemove && onRemove(tag.id)}
              className="absolute top-2 right-2 text-red-500 hover:text-red-700 print:hidden font-bold"
            >
              ×
            </button>
            
            <div className="text-center mt-2">
              <h3 className="text-2xl print:text-3xl font-black uppercase leading-tight line-clamp-2">{tag.name}</h3>
              <p className="text-gray-500 mt-1">{tag.sku}</p>
            </div>

            <div className="text-center bg-yellow-300 border-2 border-black rounded-lg py-2 mt-auto">
              <p className="text-4xl print:text-5xl font-black text-black">
                Bs. {(tag.priceUSD * currentRate).toFixed(2)}
              </p>
              <p className="text-sm font-bold mt-1 text-gray-800">
                Ref: ${tag.priceUSD.toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
