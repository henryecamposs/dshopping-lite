// dShopping Lite - Vista del Dashboard Principal
// Agrupación destacada de facturas que vencen hoy/manñana y resumen de cuentas por pagar

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useExchangeStore } from '../store/useExchangeStore';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { PaymentForm } from '../components/payments/PaymentForm';
import { Invoice } from '../types';
import { 
  TrendingUp, 
  AlertCircle, 
  CalendarRange, 
  CheckCircle, 
  DollarSign, 
  Clock, 
  FileText,
  Check,
  CalendarDays
} from 'lucide-react';
import Swal from 'sweetalert2';

export const Dashboard: React.FC = () => {
  const { company } = useAuthStore();
  const { currentRate, formatCurrencyUSD, formatCurrencyLocal, convertToLocalCurrency } = useExchangeStore();
  const { 
    invoices, 
    fetchInvoices, 
    fetchProviders,
    getTodayInvoices, 
    getTomorrowInvoices,
    updateInvoiceStatus,
    loading 
  } = useInvoiceStore();

  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (company?.id) {
      fetchInvoices(company.id);
      fetchProviders(company.id);
    }
  }, [company?.id, fetchInvoices, fetchProviders]);

  // =========================================================================
  // CÁLCULO DE METRICAS DEL DASHBOARD (En divisas e integrando Tasa cambiaria)
  // =========================================================================
  
  // Total Cuentas por Pagar (invoices en estado 'pending')
  const totalPendingUSD = invoices
    .filter(inv => inv.status === 'pending')
    .reduce((sum, inv) => sum + inv.total_invoice, 0);

  const totalPendingBs = convertToLocalCurrency(totalPendingUSD);

  // Total Vencido (invoices con fecha de vencimiento menor a hoy y estado 'pending')
  const todayStr = new Date().toISOString().split('T')[0];
  
  const totalExpiredUSD = invoices
    .filter(inv => inv.status === 'pending' && inv.due_date < todayStr)
    .reduce((sum, inv) => sum + inv.total_invoice, 0);

  const totalExpiredBs = convertToLocalCurrency(totalExpiredUSD);

  // Total Pagado
  const totalPaidUSD = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total_invoice, 0);

  const totalPaidBs = convertToLocalCurrency(totalPaidUSD);

  // Listados específicos
  const todayInvoices = getTodayInvoices();
  const tomorrowInvoices = getTomorrowInvoices();

  // Facturas por vencer en los próximos 5 días
  const expiringIn5DaysInvoices = invoices.filter(inv => {
    if (inv.status !== 'pending') return false;
    const invDate = new Date(inv.due_date);
    const today = new Date(todayStr);
    const next5Days = new Date(today);
    next5Days.setDate(today.getDate() + 5);
    return invDate >= today && invDate <= next5Days;
  });

  const totalExpiring5DaysUSD = expiringIn5DaysInvoices.reduce((sum, inv) => sum + inv.total_invoice, 0);
  const totalExpiring5DaysBs = convertToLocalCurrency(totalExpiring5DaysUSD);

  const handleMarkAsPaid = async (id: string) => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    const result = await Swal.fire({
      title: '¿Marcar como Pagada?',
      text: '¿Está seguro de marcar esta factura como PAGADA?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#8b5cf6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, marcar como pagada',
      cancelButtonText: 'Cancelar',
      background: isDarkMode ? '#1e1b4b' : '#ffffff',
      color: isDarkMode ? '#ffffff' : '#000000',
    });

    if (result.isConfirmed) {
      const success = await updateInvoiceStatus(id, 'paid');
      if (success) {
        Swal.fire({
          title: 'Factura Pagada',
          text: 'La factura ha sido marcada como pagada exitosamente.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          background: isDarkMode ? '#1e1b4b' : '#ffffff',
          color: isDarkMode ? '#ffffff' : '#000000',
        });
      } else {
        Swal.fire({
          title: 'Error',
          text: 'Ocurrió un error al actualizar el estado de la factura.',
          icon: 'error',
          confirmButtonColor: '#8b5cf6',
          background: isDarkMode ? '#1e1b4b' : '#ffffff',
          color: isDarkMode ? '#ffffff' : '#000000',
        });
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* SECCIÓN BIENVENIDA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-text-main tracking-tight">
            Resumen Operativo de Cuentas por Pagar
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Visualización y control consolidado de compromisos financieros corporativos.
          </p>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-2xl px-4 py-2 flex items-center gap-3">
          <CalendarRange className="text-primary" size={20} />
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Fecha de Operación</p>
            <p className="text-sm font-bold text-text-main font-mono">{todayStr}</p>
          </div>
        </div>
      </div>

      {/* METRICAS - TARJETAS FINANCIERAS DE ALTO IMPACTO ESTÉTICO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* TOTAL CUENTAS POR PAGAR PENDIENTES */}
        <div className="glass-card rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-2xl"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="bg-primary/10 border border-primary/20 p-3 rounded-2xl text-primary">
              <DollarSign size={24} />
            </div>
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full uppercase tracking-wider">
              Pendientes
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Pendiente (Divisas)</p>
          <p className="text-xl font-black text-text-main mt-1 font-mono">{formatCurrencyUSD(totalPendingUSD)}</p>
          
          <div className="mt-4 pt-3 border-t border-border-main flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Monto Local</span>
            <span className="text-sm font-extrabold text-primary font-mono">{formatCurrencyLocal(totalPendingBs)}</span>
          </div>
        </div>

        {/* TOTAL VENCIDO O EXPIRED */}
        <div className="glass-card rounded-3xl p-6 relative overflow-hidden border-l-4 border-l-rose-500/50">
          <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-br from-rose-500/5 to-transparent rounded-full blur-2xl"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-3 rounded-2xl text-rose-600 dark:text-rose-400">
              <AlertCircle size={24} />
            </div>
            <span className="text-[10px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Crítico
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Vencido</p>
          <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">{formatCurrencyUSD(totalExpiredUSD)}</p>
          
          <div className="mt-4 pt-3 border-t border-border-main flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Monto Local</span>
            <span className="text-sm font-extrabold text-rose-700 dark:text-rose-300 font-mono">{formatCurrencyLocal(totalExpiredBs)}</span>
          </div>
        </div>

        {/* ALERTA PRÓXIMOS 5 DÍAS */}
        <div className="glass-card rounded-3xl p-6 relative overflow-hidden border-l-4 border-l-amber-500/50">
          <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-br from-amber-500/5 to-transparent rounded-full blur-2xl"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3 rounded-2xl text-amber-600 dark:text-amber-400 animate-pulse">
              <CalendarDays size={24} />
            </div>
            <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full uppercase tracking-wider">
              En 5 Días
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Por Vencer (Próx. 5 Días)</p>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">{formatCurrencyUSD(totalExpiring5DaysUSD)}</p>
          
          <div className="mt-4 pt-3 border-t border-border-main flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Monto Local</span>
            <span className="text-sm font-extrabold text-amber-700 dark:text-amber-300 font-mono">{formatCurrencyLocal(totalExpiring5DaysBs)}</span>
          </div>
        </div>

        {/* TOTAL PAGADO */}
        <div className="glass-card rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full blur-2xl"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3 rounded-2xl text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={24} />
            </div>
            <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Pagados
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Pagado</p>
          <p className="text-xl font-black text-text-main mt-1 font-mono">{formatCurrencyUSD(totalPaidUSD)}</p>
          
          <div className="mt-4 pt-3 border-t border-border-main flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Monto Local</span>
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrencyLocal(totalPaidBs)}</span>
          </div>
        </div>

      </div>

      {/* REQUISITO DE NEGOCIO: FACTURAS QUE VENCEN HOY Y MAÑANA (SECCIÓN DESTACADA) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* VENCIMIENTOS PARA HOY */}
        <div className="glass-card rounded-3xl p-6 border border-amber-500/20 relative">
          <div className="absolute top-3 right-3 text-amber-600 dark:text-amber-400 animate-pulse">
            <Clock size={20} />
          </div>
          
          <h3 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
            Vencen Hoy ({todayInvoices.length})
          </h3>

          {todayInvoices.length === 0 ? (
            <div className="p-8 text-center bg-muted/20 border border-border-main rounded-2xl">
              <CheckCircle className="mx-auto text-muted-foreground mb-2" size={32} />
              <p className="text-muted-foreground text-sm">No hay facturas programadas para vencer hoy.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayInvoices.map((inv) => (
                <div key={inv.id} className="bg-muted/10 border border-border-main rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-main truncate">{inv.provider_name}</p>
                    <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground font-mono mt-1">
                      <span>Factura: {inv.invoice_number}</span>
                      <span>•</span>
                      <span>Control: {inv.control_number}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* MONTO A PAGAR DESTACADO (Requisito Financiero) */}
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-text-main font-mono">{formatCurrencyUSD(inv.total_invoice)}</p>
                      <p className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono" title="Monto en Bolívares al cambio de la factura">
                        {formatCurrencyLocal(inv.total_invoice * (currentRate?.rate_value || inv.exchange_rate_at_invoice))}
                      </p>
                    </div>
                    <button
                      onClick={() => setPaymentInvoice(inv)}
                      className="h-8 w-8 bg-amber-500/10 hover:bg-amber-500/30 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                      title="Registrar Pago"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* VENCIMIENTOS PARA MAÑANA */}
        <div className="glass-card rounded-3xl p-6 border border-primary/20">
          <h3 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary"></span>
            Programadas para Mañana ({tomorrowInvoices.length})
          </h3>

          {tomorrowInvoices.length === 0 ? (
            <div className="p-8 text-center bg-muted/20 border border-border-main rounded-2xl">
              <CheckCircle className="mx-auto text-muted-foreground mb-2" size={32} />
              <p className="text-muted-foreground text-sm">No hay facturas programadas para vencer mañana.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tomorrowInvoices.map((inv) => (
                <div key={inv.id} className="bg-muted/10 border border-border-main rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-main truncate">{inv.provider_name}</p>
                    <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground font-mono mt-1">
                      <span>Factura: {inv.invoice_number}</span>
                      <span>•</span>
                      <span>Control: {inv.control_number}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* MONTO A PAGAR DESTACADO (Requisito Financiero) */}
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-text-main font-mono">{formatCurrencyUSD(inv.total_invoice)}</p>
                      <p className="text-xs font-black text-primary font-mono">
                        {formatCurrencyLocal(inv.total_invoice * (currentRate?.rate_value || inv.exchange_rate_at_invoice))}
                      </p>
                    </div>
                    <button
                      onClick={() => setPaymentInvoice(inv)}
                      className="h-8 w-8 bg-primary/10 hover:bg-primary/30 text-primary rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                      title="Registrar Pago"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* TABLA DE RESUMEN INICIAL DE TODAS LAS CUENTAS POR PAGAR PENDIENTES */}
      <div className="glass-card rounded-3xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-text-main">Facturas Pendientes Críticas</h3>
          <p className="text-xs text-muted-foreground">Total: {invoices.filter(i => i.status === 'pending').length} registradas</p>
        </div>

        {invoices.filter(i => i.status === 'pending').length === 0 ? (
          <div className="p-8 text-center bg-muted/20 border border-border-main rounded-2xl">
            <FileText className="mx-auto text-muted-foreground mb-2" size={32} />
            <p className="text-muted-foreground text-sm">¡Excelente! No posee cuentas por pagar pendientes en este momento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-text-main">
              <thead className="text-xs uppercase bg-muted/30 text-muted-foreground border-b border-border-main">
                <tr>
                  <th className="px-6 py-4 font-bold">Proveedor</th>
                  <th className="px-6 py-4 font-bold">Factura</th>
                  <th className="px-6 py-4 font-bold">Fecha Factura</th>
                  <th className="px-6 py-4 font-bold">Vencimiento</th>
                  <th className="px-6 py-4 font-bold text-right">Importe ($)</th>
                  <th className="px-6 py-4 font-bold text-right">Importe local (Bs.)</th>
                  <th className="px-6 py-4 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main bg-muted/5">
                {invoices
                  .filter(i => i.status === 'pending')
                  .slice(0, 5) // Mostrar máximo 5
                  .map((inv) => {
                    const localVal = inv.total_invoice * (currentRate?.rate_value || inv.exchange_rate_at_invoice);
                    const isExpired = inv.due_date < todayStr;
                    return (
                      <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-semibold text-text-main">{inv.provider_name}</td>
                        <td className="px-6 py-4 font-mono font-medium">{inv.invoice_number}</td>
                        <td className="px-6 py-4 font-mono">{inv.invoice_date}</td>
                        <td className="px-6 py-4 font-mono">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            isExpired ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20' : 'bg-muted/50 text-muted-foreground'
                          }`}>
                            {inv.due_date}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-right text-primary">{formatCurrencyUSD(inv.total_invoice)}</td>
                        <td className="px-6 py-4 font-mono font-bold text-right text-emerald-600 dark:text-emerald-400">{formatCurrencyLocal(localVal)}</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => setPaymentInvoice(inv)}
                            className="bg-primary hover:opacity-90 text-white text-xs px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-all"
                          >
                            Pagar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE PAGOS INTERACTIVOS */}
      {paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <PaymentForm
            companyId={company?.id || ''}
            providerId={paymentInvoice.provider_id}
            invoiceId={paymentInvoice.id}
            amountDue={paymentInvoice.net_payable ?? paymentInvoice.total_invoice}
            onSuccess={() => {
              setPaymentInvoice(null);
              if (company?.id) fetchInvoices(company.id);
            }}
            onCancel={() => setPaymentInvoice(null)}
          />
        </div>
      )}
    </div>
  );
};

