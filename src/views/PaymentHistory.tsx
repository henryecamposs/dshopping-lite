import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { usePaymentStore } from '../store/usePaymentStore';
import { useExchangeStore } from '../store/useExchangeStore';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { DollarSign, Search, Calendar, Landmark, Receipt, RefreshCw, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export const PaymentHistory: React.FC = () => {
  const { company } = useAuthStore();
  const { payments, fetchAllPayments, loading } = usePaymentStore();
  const { currentRate, formatCurrencyUSD, formatCurrencyLocal } = useExchangeStore();
  const { fetchProviders, fetchInvoices } = useInvoiceStore();
  
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (company?.id) {
      fetchAllPayments(company.id);
      // Sincronizar proveedores e invoices para tener los datos enriquecidos en memoria
      fetchProviders(company.id);
      fetchInvoices(company.id);
    }
  }, [company?.id, fetchAllPayments, fetchProviders, fetchInvoices]);

  const filteredPayments = payments.filter(pay => {
    const search = searchTerm.toLowerCase();
    return (
      pay.provider_name?.toLowerCase().includes(search) ||
      pay.invoice_number?.toLowerCase().includes(search) ||
      pay.reference_number?.toLowerCase().includes(search) ||
      pay.payment_method?.toLowerCase().includes(search)
    );
  });

  const handleExportExcel = () => {
    try {
      const dataToExport = filteredPayments.map(pay => ({
        'Proveedor': pay.provider_name,
        'Nro. Factura': pay.invoice_number,
        'Fecha de Pago': pay.payment_date,
        'Método': pay.payment_method,
        'Referencia': pay.reference_number || 'S/N',
        'Banco Origen': pay.origin_bank || '-',
        'Moneda de Pago': pay.currency,
        'Importe Pagado': pay.amount_paid,
        'Monto USD': pay.currency === 'USD' ? pay.amount_paid : pay.amount_paid / (currentRate?.rate_value || 45),
        'Monto Local (Bs.)': pay.currency === 'VES' ? pay.amount_paid : pay.amount_paid * (currentRate?.rate_value || 45),
        'Observación': pay.observation || ''
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      XLSX.utils.book_append_sheet(wb, ws, 'Historial de Pagos');
      XLSX.writeFile(wb, `Historial_Pagos_${company?.name || 'Empresa'}.xlsx`);
    } catch (err: any) {
      alert('Error al exportar a Excel: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight flex items-center gap-2">
            <Landmark className="text-primary" />
            Historial de Pagos
          </h2>
          <p className="text-muted-foreground text-sm">Resumen cronológico global de egresos y amortizaciones de deudas.</p>
        </div>
        
        {filteredPayments.length > 0 && (
          <button
            onClick={handleExportExcel}
            className="btn-secondary text-xs flex items-center gap-2"
          >
            <FileSpreadsheet size={16} />
            Exportar Excel
          </button>
        )}
      </div>

      {/* BUSCADOR */}
      <div className="glass-card rounded-3xl p-6">
        <div className="relative flex items-center mb-6">
          <span className="absolute left-4 text-slate-500">
            <Search size={18} />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-premium w-full pl-11 text-sm"
            placeholder="Buscar por Proveedor, Factura, Nro. Referencia o Método..."
          />
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm font-semibold animate-pulse">
            <RefreshCw className="mx-auto text-primary animate-spin mb-2" size={24} />
            Consultando transacciones históricas...
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center bg-muted/20 border border-border-main rounded-2xl">
            <Receipt className="mx-auto text-muted-foreground mb-2" size={40} />
            <p className="text-muted-foreground text-sm font-semibold">No se encontraron registros de pagos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-text-main">
              <thead className="text-xs uppercase bg-muted/30 text-muted-foreground border-b border-border-main">
                <tr>
                  <th className="px-6 py-4 font-bold">Proveedor</th>
                  <th className="px-6 py-4 font-bold">Factura</th>
                  <th className="px-6 py-4 font-bold">Fecha Pago</th>
                  <th className="px-6 py-4 font-bold">Método / Ref</th>
                  <th className="px-6 py-4 font-bold text-right">Importe Registrado</th>
                  <th className="px-6 py-4 font-bold text-right">Monto ($)</th>
                  <th className="px-6 py-4 font-bold text-right">Monto (Bs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main bg-muted/5">
                {filteredPayments.map((pay) => {
                  const isVES = pay.currency === 'VES';
                  const rate = currentRate?.rate_value || 45; // Tasa fallback
                  const usdVal = isVES ? pay.amount_paid / rate : pay.amount_paid;
                  const vesVal = isVES ? pay.amount_paid : pay.amount_paid * rate;

                  return (
                    <tr key={pay.id} className="hover:bg-muted/25 transition-colors">
                      <td className="px-6 py-4 font-semibold text-text-main">
                        <p className="truncate max-w-[200px]">{pay.provider_name}</p>
                        {pay.observation && (
                          <span className="text-[10px] text-primary/80 block mt-0.5">{pay.observation}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Receipt size={13} className="text-slate-400" />
                          {pay.invoice_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-slate-400" />
                          {pay.payment_date}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-text-main">{pay.payment_method}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">Ref: {pay.reference_number || 'S/N'}</p>
                        {pay.origin_bank && (
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 px-1 py-0.5 rounded">
                            {pay.origin_bank}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-right text-text-main">
                        {pay.currency === 'USD' ? '$' : 'Bs.'} {pay.amount_paid.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-right text-primary">
                        {formatCurrencyUSD(usdVal)}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-right text-emerald-600 dark:text-emerald-400">
                        {formatCurrencyLocal(vesVal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

