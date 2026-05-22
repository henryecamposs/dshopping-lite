import React, { useState } from 'react';
import { useRetentionStore } from '../../store/retentionStore';
import { Invoice } from '../../types';
import { useExchangeStore } from '../../store/exchangeStore';
import { Percent, ClipboardList, ShieldCheck } from 'lucide-react';
import Swal from 'sweetalert2';

interface RetentionFormProps {
  companyId: string;
  invoiceId: string;
  invoiceData: Invoice;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const RetentionForm: React.FC<RetentionFormProps> = ({ 
  companyId, 
  invoiceId, 
  invoiceData,
  onSuccess,
  onCancel 
}) => {
  const { addRetention, loading } = useRetentionStore();
  const { formatCurrencyUSD } = useExchangeStore();
  
  const [retentionType, setRetentionType] = useState<'IVA' | 'ISLR'>('IVA');
  const [ivaPercentage, setIvaPercentage] = useState<75 | 100>(75);
  const [islrPercentage, setIslrPercentage] = useState<number>(2);
  const [islrConcept, setIslrConcept] = useState<string>('Servicios');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let retentionAmount = 0;
    
    if (retentionType === 'IVA') {
      retentionAmount = (invoiceData.iva_amount * ivaPercentage) / 100;
      const success = await addRetention({
        invoice_id: invoiceId,
        company_id: companyId,
        type: 'IVA',
        retention_percentage: ivaPercentage,
        retention_amount: Number(retentionAmount.toFixed(2))
      });
      if (success) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Retención de IVA aplicada.',
          showConfirmButton: false,
          timer: 2000,
          background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
          color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
        });
        if (onSuccess) onSuccess();
      } else {
        Swal.fire('Error', 'No se pudo aplicar la retención. Recuerde que solo se permite una retención de cada tipo por factura.', 'error');
      }
    } else {
      retentionAmount = (invoiceData.base_taxable * islrPercentage) / 100;
      const success = await addRetention({
        invoice_id: invoiceId,
        company_id: companyId,
        type: 'ISLR',
        retention_percentage: islrPercentage,
        retention_amount: Number(retentionAmount.toFixed(2)),
        islr_concept: islrConcept
      });
      if (success) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Retención de ISLR aplicada.',
          showConfirmButton: false,
          timer: 2000,
          background: document.documentElement.classList.contains('dark') ? '#1e1b4b' : '#ffffff',
          color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
        });
        if (onSuccess) onSuccess();
      } else {
        Swal.fire('Error', 'No se pudo aplicar la retención. Recuerde que solo se permite una retención de cada tipo por factura.', 'error');
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-border-main dark:border-indigo-950/40 w-full max-w-md mx-auto shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-text-main">Aplicar Retención</h2>
          <p className="text-xs text-muted-foreground font-semibold uppercase font-mono">Factura: {invoiceData.invoice_number}</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Tipo de Retención</label>
          <select 
            className="input-premium w-full text-sm py-2.5"
            value={retentionType}
            onChange={(e) => setRetentionType(e.target.value as 'IVA' | 'ISLR')}
          >
            <option value="IVA">Retención de IVA (SENIAT)</option>
            <option value="ISLR">Retención de ISLR</option>
          </select>
        </div>

        {retentionType === 'IVA' ? (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Porcentaje de Retención (IVA)</label>
              <select 
                className="input-premium w-full text-sm py-2.5"
                value={ivaPercentage}
                onChange={(e) => setIvaPercentage(Number(e.target.value) as 75 | 100)}
              >
                <option value={75}>75% (Por Defecto)</option>
                <option value={100}>100% (Casos Especiales)</option>
              </select>
            </div>
            
            <div className="bg-muted/15 border border-border-main/50 p-4 rounded-2xl text-xs space-y-2 font-semibold">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto IVA Factura:</span>
                <span className="text-text-main font-mono">{formatCurrencyUSD(invoiceData.iva_amount)}</span>
              </div>
              <div className="flex justify-between border-t border-border-main/40 pt-2 text-sm font-extrabold">
                <span className="text-primary flex items-center gap-1">
                  <Percent size={14} /> Retenido:
                </span>
                <span className="text-primary font-mono">
                  {formatCurrencyUSD((invoiceData.iva_amount * ivaPercentage) / 100)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Concepto ISLR</label>
              <select 
                className="input-premium w-full text-sm py-2.5"
                value={islrConcept}
                onChange={(e) => setIslrConcept(e.target.value)}
              >
                <option value="Servicios (2%)">Servicios a Personas Jurídicas (2%)</option>
                <option value="Fletes (3%)">Fletes y Transportes (3%)</option>
                <option value="Honorarios (5%)">Honorarios Profesionales (5%)</option>
                <option value="Arrendamientos (5%)">Arrendamiento de Bienes (5%)</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Porcentaje de Retención (ISLR %)</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                max="100"
                className="input-premium w-full text-sm font-mono"
                value={islrPercentage}
                onChange={(e) => setIslrPercentage(Number(e.target.value))}
                required
              />
            </div>
            
            <div className="bg-muted/15 border border-border-main/50 p-4 rounded-2xl text-xs space-y-2 font-semibold">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Imponible Factura:</span>
                <span className="text-text-main font-mono">{formatCurrencyUSD(invoiceData.base_taxable)}</span>
              </div>
              <div className="flex justify-between border-t border-border-main/40 pt-2 text-sm font-extrabold">
                <span className="text-primary flex items-center gap-1">
                  <ClipboardList size={14} /> Retenido:
                </span>
                <span className="text-primary font-mono">
                  {formatCurrencyUSD((invoiceData.base_taxable * islrPercentage) / 100)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2.5 pt-4 border-t border-border-main/40">
          <button 
            type="button" 
            onClick={onCancel}
            className="btn-secondary text-xs py-2 px-4 cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary text-xs py-2 px-4 cursor-pointer"
          >
            {loading ? 'Aplicando...' : 'Confirmar Retención'}
          </button>
        </div>
      </form>
    </div>
  );
};
