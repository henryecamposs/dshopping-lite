// dShopping Lite - Centro de Reportes y Consultas Avanzadas
// Panel consolidado: Reporte de Facturas, Reporte de Pagos y Reporte de Retenciones
// Integrado bajo la metodología SDD por @Dev_React

import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { useExchangeStore } from '../store/exchangeStore';
import { useInvoiceStore } from '../store/invoiceStore';
import { usePaymentStore } from '../store/paymentStore';
import { useRetentionStore } from '../store/retentionStore';
import { ExportModal } from '../components/ExportModal';
import { 
  FileSpreadsheet, 
  Printer, 
  Search, 
  Filter, 
  RefreshCw, 
  ChevronDown, 
  CalendarClock,
  TrendingUp,
  Receipt,
  Download,
  Clock,
  ShieldAlert,
  Coins,
  FileCheck,
  CreditCard,
  User,
  X
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { company } = useAuthStore();
  const { currentRate, formatCurrencyUSD, formatCurrencyLocal, convertToLocalCurrency } = useExchangeStore();
  
  // Stores
  const { 
    invoices, 
    providers, 
    filters, 
    setFilter, 
    resetFilters, 
    fetchInvoices, 
    fetchProviders, 
    getFilteredInvoices 
  } = useInvoiceStore();

  const { payments, fetchAllPayments, loading: paymentsLoading } = usePaymentStore();
  const { retentions, fetchAllRetentions, loading: retentionsLoading } = useRetentionStore();

  // Estados locales del Centro de Reportes
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'retentions'>('invoices');
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Filtros específicos para Pagos y Retenciones (para mantener la independencia de estados)
  const [paymentsProviderFilter, setPaymentsProviderFilter] = useState('all');
  const [paymentsMethodFilter, setPaymentsMethodFilter] = useState('all');
  const [paymentsDateFilter, setPaymentsDateFilter] = useState('');

  const [retentionsProviderFilter, setRetentionsProviderFilter] = useState('all');
  const [retentionsTypeFilter, setRetentionsTypeFilter] = useState('all');
  const [retentionsDateFilter, setRetentionsDateFilter] = useState('');

  useEffect(() => {
    if (company?.id) {
      fetchInvoices(company.id);
      fetchProviders(company.id);
      fetchAllPayments(company.id);
      fetchAllRetentions(company.id);
    }
  }, [company?.id, fetchInvoices, fetchProviders, fetchAllPayments, fetchAllRetentions]);

  const activeRate = currentRate?.rate_value || 45.0;

  // =========================================================================
  // 1. DATA FILTRADA POR PESTAÑA
  // =========================================================================

  // A. Facturas (Zustand original)
  const filteredInvoices = getFilteredInvoices();

  // B. Pagos
  const filteredPayments = useMemo(() => {
    return payments.filter(pay => {
      const matchesProvider = paymentsProviderFilter === 'all' || pay.provider_id === paymentsProviderFilter;
      const matchesMethod = paymentsMethodFilter === 'all' || pay.payment_method === paymentsMethodFilter;
      const matchesDate = !paymentsDateFilter || pay.payment_date === paymentsDateFilter;
      return matchesProvider && matchesMethod && matchesDate;
    });
  }, [payments, paymentsProviderFilter, paymentsMethodFilter, paymentsDateFilter]);

  // C. Retenciones
  const filteredRetentions = useMemo(() => {
    return retentions.filter(ret => {
      const matchesProvider = retentionsProviderFilter === 'all' || ret.provider_id === retentionsProviderFilter;
      const matchesType = retentionsTypeFilter === 'all' || ret.type === retentionsTypeFilter;
      const matchesDate = !retentionsDateFilter || ret.created_at.startsWith(retentionsDateFilter);
      return matchesProvider && matchesType && matchesDate;
    });
  }, [retentions, retentionsProviderFilter, retentionsTypeFilter, retentionsDateFilter]);

  // =========================================================================
  // 2. CÁLCULO DE TOTALES PARA ENCABEZADO DE REPORTE (DINÁMICO POR PESTAÑA)
  // =========================================================================
  
  // Totales de Facturas
  const totalInvoicesUSD = filteredInvoices.reduce((sum, inv) => sum + inv.total_invoice, 0);
  const totalInvoicesBs = convertToLocalCurrency(totalInvoicesUSD);
  const pendingInvoicesUSD = filteredInvoices
    .filter(inv => inv.status === 'pending')
    .reduce((sum, inv) => sum + inv.total_invoice, 0);

  // Totales de Pagos
  const paymentsStats = useMemo(() => {
    let totalUSD = 0;
    let totalBs = 0;
    let maxPayment = 0;

    filteredPayments.forEach(p => {
      const pRate = p.exchange_rate_value || activeRate;
      if (p.currency === 'USD') {
        totalUSD += p.amount_paid;
        totalBs += p.amount_paid * pRate;
        if (p.amount_paid > maxPayment) maxPayment = p.amount_paid;
      } else {
        totalBs += p.amount_paid;
        totalUSD += p.amount_paid / pRate;
        const usdEquivalent = p.amount_paid / pRate;
        if (usdEquivalent > maxPayment) maxPayment = usdEquivalent;
      }
    });

    return { totalUSD, totalBs, maxPayment };
  }, [filteredPayments, activeRate]);

  // Totales de Retenciones
  const retentionsStats = useMemo(() => {
    let totalIVABs = 0;
    let totalISLRBs = 0;
    let maxRetentionBs = 0;

    filteredRetentions.forEach(r => {
      const rRate = r.exchange_rate_at_invoice || activeRate;
      const amountBs = r.retention_amount * rRate; // Supabase guarda retención de IVA/ISLR en USD originalmente, lo convertimos a Bs

      if (r.type === 'IVA') {
        totalIVABs += amountBs;
      } else {
        totalISLRBs += amountBs;
      }

      if (amountBs > maxRetentionBs) maxRetentionBs = amountBs;
    });

    return { totalIVABs, totalISLRBs, maxRetentionBs };
  }, [filteredRetentions, activeRate]);

  // =========================================================================
  // 3. EXPORTACIÓN A EXCEL EN FORMATO LIMPIO CSV
  // =========================================================================
  const exportToExcel = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = '';

    const todayStr = new Date().toISOString().split('T')[0];

    if (activeTab === 'invoices') {
      if (filteredInvoices.length === 0) return alert('No hay facturas filtradas para exportar.');
      headers = [
        'Proveedor', 'RIF Proveedor', 'Numero Factura', 'Numero Control', 'Fecha Emision', 
        'Dias Credito', 'Fecha Vencimiento', 'Base Imponible (USD)', 'Base Exenta (USD)', 
        'IVA %', 'IVA Cantidad (USD)', 'Total Factura (USD)', 'Tasa Cambio', 'Total Factura (Bs.)', 'Estado'
      ];
      rows = filteredInvoices.map((inv) => [
        `"${inv.provider_name?.replace(/"/g, '""')}"`,
        `"${providers.find(p => p.id === inv.provider_id)?.rif || ''}"`,
        `"${inv.invoice_number}"`,
        `"${inv.control_number}"`,
        inv.invoice_date,
        inv.credit_days,
        inv.due_date,
        inv.base_taxable,
        inv.base_exempt,
        inv.iva_percentage,
        inv.iva_amount,
        inv.total_invoice,
        inv.exchange_rate_at_invoice,
        (inv.total_invoice * inv.exchange_rate_at_invoice).toFixed(2),
        inv.status.toUpperCase()
      ]);
      filename = `dShopping_Reporte_Facturas_${company?.name.replace(/\s+/g, '_')}_${todayStr}.csv`;
    } 
    else if (activeTab === 'payments') {
      if (filteredPayments.length === 0) return alert('No hay pagos filtrados para exportar.');
      headers = [
        'Fecha Pago', 'Proveedor', 'Factura Afectada', 'Metodo Pago', 'Referencia', 'Banco Origen', 
        'Monto Original', 'Moneda', 'Tasa Cambio', 'Monto Equivalente (Bs.)', 'Monto Equivalente (USD)', 'Observacion'
      ];
      rows = filteredPayments.map((pay) => {
        const pRate = pay.exchange_rate_value || activeRate;
        const totalBs = pay.currency === 'USD' ? pay.amount_paid * pRate : pay.amount_paid;
        const totalUSD = pay.currency === 'VES' ? pay.amount_paid / pRate : pay.amount_paid;

        return [
          pay.payment_date,
          `"${pay.provider_name?.replace(/"/g, '""')}"`,
          `"${pay.invoice_number || 'Sin Factura'}"`,
          `"${pay.payment_method}"`,
          `"${pay.reference_number || '-'}"`,
          `"${pay.origin_bank || '-'}"`,
          pay.amount_paid,
          pay.currency,
          pRate,
          totalBs.toFixed(2),
          totalUSD.toFixed(2),
          `"${pay.observation || ''}"`
        ];
      });
      filename = `dShopping_Reporte_Pagos_${company?.name.replace(/\s+/g, '_')}_${todayStr}.csv`;
    } 
    else if (activeTab === 'retentions') {
      if (filteredRetentions.length === 0) return alert('No hay retenciones filtradas para exportar.');
      headers = [
        'Correlativo SENIAT', 'Fecha Retencion', 'Proveedor', 'RIF Proveedor', 'Nro. Factura', 
        'Tipo Retencion', 'Base Imponible (USD)', 'Tasa Cambio Factura', 'Monto Factura (USD)', 
        'Porcentaje Retencion (%)', 'Monto Retenido (USD)', 'Monto Retenido (Bs.)', 'Concepto ISLR'
      ];
      rows = filteredRetentions.map((ret) => {
        const rRate = ret.exchange_rate_at_invoice || activeRate;
        const amountBs = ret.retention_amount * rRate;

        return [
          `"${ret.correlative_number || '-'}"`,
          ret.created_at.split('T')[0],
          `"${ret.provider_name?.replace(/"/g, '""')}"`,
          `"${ret.provider_rif || ''}"`,
          `"${ret.invoice_number}"`,
          ret.type,
          ret.base_taxable,
          rRate,
          ret.total_invoice,
          ret.retention_percentage,
          ret.retention_amount,
          amountBs.toFixed(2),
          `"${ret.islr_concept || '-'}"`
        ];
      });
      filename = `dShopping_Reporte_Retenciones_${company?.name.replace(/\s+/g, '_')}_${todayStr}.csv`;
    }

    // Construcción del CSV con BOM para Excel
    const csvContent = 
      'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print-container">
      
      {/* CABECERA EJECUTIVA PARA EL PDF IMPRESO (Oculta en pantalla) */}
      <div className="print-header">
        <h1>dShopping Lite — Reporte Financiero de Compras y Egresos</h1>
        <p><strong>Empresa:</strong> {company?.name} | RIF: {company?.rif}</p>
        <p>
          <strong>Tipo de Reporte:</strong> {
            activeTab === 'invoices' ? 'Cuentas por Pagar (Facturas)' :
            activeTab === 'payments' ? 'Histórico de Pagos de Proveedores' : 'Retenciones IVA / ISLR de Proveedores'
          }
        </p>
        <p><strong>Fecha de Emisión del Reporte:</strong> {new Date().toLocaleDateString()} | <strong>Tasa Cambiaria Hoy:</strong> {activeRate.toFixed(2)} Bs/$</p>
      </div>

      {/* CABECERA (Pantalla) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight flex items-center gap-2">
            Centro de Reportes Consolidados
          </h2>
          <p className="text-muted-foreground text-sm">Genere, filtre y exporte balances financieros corporativos de facturas, pagos y retenciones.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handlePrint}
            className="btn-secondary text-xs cursor-pointer"
          >
            <Printer size={16} className="text-primary" />
            Imprimir Reporte
          </button>
          
          {activeTab === 'invoices' ? (
            <button
              onClick={() => setIsExportOpen(true)}
              className="btn-primary text-xs cursor-pointer flex items-center gap-2"
            >
              <Download size={16} />
              Exportador Avanzado
            </button>
          ) : (
            <button
              onClick={exportToExcel}
              className="btn-primary text-xs cursor-pointer flex items-center gap-2"
            >
              <FileSpreadsheet size={16} />
              Exportar CSV / Excel
            </button>
          )}
        </div>
      </div>

      {/* PESTAÑAS DERECHAS DE ACCESO (TABS) */}
      <div className="flex border-b border-border-main/60 no-print">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'invoices'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-text-main hover:bg-muted/15'
          }`}
        >
          <div className="flex items-center gap-2">
            <Receipt size={16} />
            Reporte de Facturas
          </div>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'payments'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-text-main hover:bg-muted/15'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock size={16} />
            Reporte de Pagos
          </div>
        </button>

        <button
          onClick={() => setActiveTab('retentions')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'retentions'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-text-main hover:bg-muted/15'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} />
            Reporte de Retenciones
          </div>
        </button>
      </div>

      {/* =========================================================================
          FILTROS DINÁMICOS POR PESTAÑA (Pantalla)
         ========================================================================= */}
      <div className="glass-card rounded-3xl p-6 no-print">
        
        {/* PESTAÑA 1: FILTROS FACTURAS */}
        {activeTab === 'invoices' && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Proveedor</label>
              <select
                value={filters.providerId}
                onChange={(e) => setFilter('providerId', e.target.value)}
                className="input-premium w-full text-xs"
              >
                <option value="all">Todos los Proveedores</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Estado de Pago</label>
              <select
                value={filters.status}
                onChange={(e) => setFilter('status', e.target.value)}
                className="input-premium w-full text-xs"
              >
                <option value="all">Cualquier Estado</option>
                <option value="pending">Pendiente (Por Pagar)</option>
                <option value="paid">Pagado (Cerrado)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Vencimiento</label>
              <select
                value={filters.dueDateRange}
                onChange={(e) => setFilter('dueDateRange', e.target.value)}
                className="input-premium w-full text-xs"
              >
                <option value="all">Todas las Fechas</option>
                <option value="today">Vencen Hoy</option>
                <option value="tomorrow">Vencen Mañana</option>
                <option value="week">Próximos 7 días</option>
                <option value="month">Próximos 30 días</option>
                <option value="expired">Vencidas (Sin pagar)</option>
                <option value="custom">Rango de Fechas</option>
              </select>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-3 text-muted-foreground">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  value={filters.searchTerm}
                  onChange={(e) => setFilter('searchTerm', e.target.value)}
                  className="input-premium w-full pl-9 text-xs"
                  placeholder="Buscar..."
                />
              </div>
              <button
                onClick={resetFilters}
                className="p-2.5 bg-muted/20 hover:bg-muted/35 text-muted-foreground hover:text-text-main rounded-xl border border-border-main transition-colors cursor-pointer"
                title="Restablecer Filtros"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: FILTROS PAGOS */}
        {activeTab === 'payments' && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Proveedor</label>
              <select
                value={paymentsProviderFilter}
                onChange={(e) => setPaymentsProviderFilter(e.target.value)}
                className="input-premium w-full text-xs"
              >
                <option value="all">Todos los Proveedores</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Método de Pago</label>
              <select
                value={paymentsMethodFilter}
                onChange={(e) => setPaymentsMethodFilter(e.target.value)}
                className="input-premium w-full text-xs"
              >
                <option value="all">Cualquier Método</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Pago Móvil">Pago Móvil</option>
                <option value="Zelle">Zelle</option>
                <option value="Efectivo">Efectivo</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fecha del Pago</label>
              <input
                type="date"
                value={paymentsDateFilter}
                onChange={(e) => setPaymentsDateFilter(e.target.value)}
                className="input-premium w-full text-xs font-mono"
              />
            </div>

            <div className="flex justify-end">
              {(paymentsProviderFilter !== 'all' || paymentsMethodFilter !== 'all' || paymentsDateFilter) && (
                <button
                  onClick={() => {
                    setPaymentsProviderFilter('all');
                    setPaymentsMethodFilter('all');
                    setPaymentsDateFilter('');
                  }}
                  className="btn-secondary text-xs flex items-center gap-2 border-rose-500/10 text-rose-500 hover:bg-rose-500/5 hover:border-rose-500/25 w-full justify-center"
                >
                  <X size={14} />
                  Limpiar Filtros
                </button>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 3: FILTROS RETENCIONES */}
        {activeTab === 'retentions' && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Proveedor</label>
              <select
                value={retentionsProviderFilter}
                onChange={(e) => setRetentionsProviderFilter(e.target.value)}
                className="input-premium w-full text-xs"
              >
                <option value="all">Todos los Proveedores</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipo Retención</label>
              <select
                value={retentionsTypeFilter}
                onChange={(e) => setRetentionsTypeFilter(e.target.value)}
                className="input-premium w-full text-xs"
              >
                <option value="all">IVA e ISLR</option>
                <option value="IVA">IVA</option>
                <option value="ISLR">ISLR</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mes / Fecha</label>
              <input
                type="date"
                value={retentionsDateFilter}
                onChange={(e) => setRetentionsDateFilter(e.target.value)}
                className="input-premium w-full text-xs font-mono"
              />
            </div>

            <div className="flex justify-end">
              {(retentionsProviderFilter !== 'all' || retentionsTypeFilter !== 'all' || retentionsDateFilter) && (
                <button
                  onClick={() => {
                    setRetentionsProviderFilter('all');
                    setRetentionsTypeFilter('all');
                    setRetentionsDateFilter('');
                  }}
                  className="btn-secondary text-xs flex items-center gap-2 border-rose-500/10 text-rose-500 hover:bg-rose-500/5 hover:border-rose-500/25 w-full justify-center"
                >
                  <X size={14} />
                  Limpiar Filtros
                </button>
              )}
            </div>
          </div>
        )}

        {/* Rango de Fechas Personalizado Facturas */}
        {activeTab === 'invoices' && filters.dueDateRange === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border-main/50 animate-in fade-in duration-200">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fecha Inicio</label>
              <input
                type="date"
                value={filters.customStartDate || ''}
                onChange={(e) => setFilter('customStartDate', e.target.value)}
                className="input-premium w-full text-xs font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fecha Fin</label>
              <input
                type="date"
                value={filters.customEndDate || ''}
                onChange={(e) => setFilter('customEndDate', e.target.value)}
                className="input-premium w-full text-xs font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          RESUMEN DE TOTALES FILTRADOS (Impresión y Pantalla)
         ========================================================================= */}
      
      {/* TOTALES: FACTURAS */}
      {activeTab === 'invoices' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-3xl p-5 print-text-dark print:border-slate-300">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Facturas Filtradas</p>
            <p className="text-lg font-bold text-text-main print-text-dark font-mono">{filteredInvoices.length} registros</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Seleccionado ($)</p>
            <p className="text-lg font-bold text-primary print-text-dark font-mono">{formatCurrencyUSD(totalInvoicesUSD)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Equivalente (Bs.)</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 print-text-dark font-mono">{formatCurrencyLocal(totalInvoicesBs)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Pendiente de Pago</p>
            <p className="text-lg font-bold text-amber-650 dark:text-amber-550 print-text-dark font-mono">{formatCurrencyUSD(pendingInvoicesUSD)}</p>
          </div>
        </div>
      )}

      {/* TOTALES: PAGOS */}
      {activeTab === 'payments' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-3xl p-5 print-text-dark print:border-slate-300">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Pagos Filtrados</p>
            <p className="text-lg font-bold text-text-main print-text-dark font-mono">{filteredPayments.length} transacciones</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Pagado (USD)</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 print-text-dark font-mono">${paymentsStats.totalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Pagado (Bs.)</p>
            <p className="text-lg font-bold text-primary print-text-dark font-mono">Bs. {paymentsStats.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Pago Más Alto (USD)</p>
            <p className="text-lg font-bold text-indigo-500 print-text-dark font-mono">${paymentsStats.maxPayment.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      )}

      {/* TOTALES: RETENCIONES */}
      {activeTab === 'retentions' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-3xl p-5 print-text-dark print:border-slate-300">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Retenciones Filtradas</p>
            <p className="text-lg font-bold text-text-main print-text-dark font-mono">{filteredRetentions.length} retenciones</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Retenciones IVA (Bs.)</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 print-text-dark font-mono">Bs. {retentionsStats.totalIVABs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Retenciones ISLR (Bs.)</p>
            <p className="text-lg font-bold text-primary print-text-dark font-mono font-mono">Bs. {retentionsStats.totalISLRBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Retención Máxima (Bs.)</p>
            <p className="text-lg font-bold text-amber-650 dark:text-amber-500 print-text-dark font-mono">Bs. {retentionsStats.maxRetentionBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      )}

      {/* =========================================================================
          TABLAS DE RESULTADOS POR PESTAÑA
         ========================================================================= */}
      
      {/* TABLA: FACTURAS */}
      {activeTab === 'invoices' && (
        <div className="glass-card rounded-3xl p-6 print:border-none print:shadow-none">
          {filteredInvoices.length === 0 ? (
            <div className="p-12 text-center bg-muted/20 border border-border-main/50 border-dashed rounded-2xl">
              <Receipt className="mx-auto text-muted-foreground mb-2" size={40} />
              <p className="text-muted-foreground text-sm font-semibold">No hay facturas registradas que cumplan con los filtros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-text-main/80 dark:text-slate-350">
                <thead className="text-[11px] font-extrabold uppercase bg-muted/30 text-muted-foreground border-b border-border-main tracking-wider">
                  <tr>
                    <th className="px-6 py-4 rounded-l-xl">Proveedor / RIF</th>
                    <th className="px-6 py-4">Nro. Factura</th>
                    <th className="px-6 py-4">Nro. Control</th>
                    <th className="px-6 py-4">Emisión</th>
                    <th className="px-6 py-4">Vencimiento</th>
                    <th className="px-6 py-4 text-right">Importe ($)</th>
                    <th className="px-6 py-4 text-right">Monto Bs.</th>
                    <th className="px-6 py-4 text-center rounded-r-xl">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main/40 bg-muted/10 dark:bg-muted/5">
                  {filteredInvoices.map((inv) => {
                    const rif = providers.find(p => p.id === inv.provider_id)?.rif || 'S/N';
                    const activeRate = currentRate?.rate_value || inv.exchange_rate_at_invoice;
                    const localVal = inv.total_invoice * activeRate;
                    return (
                      <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 font-bold text-text-main print-text-dark">
                          <p className="truncate max-w-[200px]">{inv.provider_name}</p>
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">{rif}</span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold print-text-dark">{inv.invoice_number}</td>
                        <td className="px-6 py-4 font-mono text-xs print-text-dark">{inv.control_number}</td>
                        <td className="px-6 py-4 font-mono text-xs print-text-dark">{inv.invoice_date.split('-').reverse().join('/')}</td>
                        <td className="px-6 py-4 font-mono text-xs print-text-dark">{inv.due_date.split('-').reverse().join('/')}</td>
                        <td className="px-6 py-4 font-mono font-bold text-right text-primary print-text-dark print-text-right">
                          {formatCurrencyUSD(inv.total_invoice)}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-right text-emerald-650 dark:text-emerald-400 print-text-dark print-text-right">
                          {formatCurrencyLocal(localVal)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase border ${
                            inv.status === 'paid'
                              ? 'bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/5 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          }`}>
                            {inv.status === 'paid' ? 'Pagado' : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TABLA: HISTÓRICO DE PAGOS */}
      {activeTab === 'payments' && (
        <div className="glass-card rounded-3xl p-6 print:border-none print:shadow-none">
          {paymentsLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm font-semibold animate-pulse">
              Buscando historial de transacciones bancarias...
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-12 text-center bg-muted/20 border border-border-main/50 border-dashed rounded-2xl">
              <Clock className="mx-auto text-muted-foreground mb-2" size={40} />
              <p className="text-muted-foreground text-sm font-semibold">No se encontraron registros de pago en este periodo.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-text-main/80 dark:text-slate-350">
                <thead className="text-[11px] font-extrabold uppercase bg-muted/30 text-muted-foreground border-b border-border-main tracking-wider">
                  <tr>
                    <th className="px-6 py-4 rounded-l-xl">Fecha Pago</th>
                    <th className="px-6 py-4">Proveedor</th>
                    <th className="px-6 py-4">Factura Afectada</th>
                    <th className="px-6 py-4">Metodo / Canal</th>
                    <th className="px-6 py-4">Referencia</th>
                    <th className="px-6 py-4 text-right">Monto Original</th>
                    <th className="px-6 py-4 text-center">Tasa Cambio</th>
                    <th className="px-6 py-4 text-right rounded-r-xl">Equivalente Bs. / USD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main/40 bg-muted/10 dark:bg-muted/5">
                  {filteredPayments.map((pay) => {
                    const pRate = pay.exchange_rate_value || activeRate;
                    const totalBs = pay.currency === 'USD' ? pay.amount_paid * pRate : pay.amount_paid;
                    const totalUSD = pay.currency === 'VES' ? pay.amount_paid / pRate : pay.amount_paid;

                    return (
                      <tr key={pay.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-xs print-text-dark whitespace-nowrap">
                          {pay.payment_date.split('-').reverse().join('/')}
                        </td>
                        <td className="px-6 py-4 font-bold text-text-main print-text-dark">
                          {pay.provider_name}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs print-text-dark">
                          {pay.invoice_number || 'Sin Factura'}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold print-text-dark">
                          {pay.payment_method} {pay.origin_bank ? `(${pay.origin_bank})` : ''}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs print-text-dark font-semibold">
                          {pay.reference_number || '-'}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-extrabold">
                          <span className={pay.currency === 'USD' ? 'text-emerald-555 dark:text-emerald-400' : 'text-amber-650 dark:text-amber-400'}>
                            {pay.currency === 'USD' ? '$' : 'Bs.'} {pay.amount_paid.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs text-muted-foreground font-bold">
                          {pRate.toFixed(2)} Bs.
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono font-black text-xs text-text-main">
                              Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="font-mono text-[9px] text-muted-foreground font-bold">
                              $ {totalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TABLA: REPORTE DE RETENCIONES */}
      {activeTab === 'retentions' && (
        <div className="glass-card rounded-3xl p-6 print:border-none print:shadow-none">
          {retentionsLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm font-semibold animate-pulse">
              Consultando actas de retenciones fiscales IVA/ISLR...
            </div>
          ) : filteredRetentions.length === 0 ? (
            <div className="p-12 text-center bg-muted/20 border border-border-main/50 border-dashed rounded-2xl">
              <ShieldAlert className="mx-auto text-muted-foreground mb-2" size={40} />
              <p className="text-muted-foreground text-sm font-semibold">No se encontraron actas de retención aplicadas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-text-main/80 dark:text-slate-350">
                <thead className="text-[11px] font-extrabold uppercase bg-muted/30 text-muted-foreground border-b border-border-main tracking-wider">
                  <tr>
                    <th className="px-6 py-4 rounded-l-xl">Correlativo SENIAT</th>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Proveedor</th>
                    <th className="px-6 py-4">Factura</th>
                    <th className="px-6 py-4 text-center">Tipo</th>
                    <th className="px-6 py-4 text-right">Base Imponible</th>
                    <th className="px-6 py-4 text-center">Porcentaje (%)</th>
                    <th className="px-6 py-4 text-right">Monto Retenido ($)</th>
                    <th className="px-6 py-4 text-right rounded-r-xl">Retenido en Bs.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main/40 bg-muted/10 dark:bg-muted/5">
                  {filteredRetentions.map((ret) => {
                    const rRate = ret.exchange_rate_at_invoice || activeRate;
                    const amountBs = ret.retention_amount * rRate;
                    const dateFormatted = ret.created_at.split('T')[0].split('-').reverse().join('/');

                    return (
                      <tr key={ret.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 font-mono font-black text-xs text-primary print-text-dark whitespace-nowrap">
                          {ret.correlative_number || 'S/C'}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs print-text-dark">
                          {dateFormatted}
                        </td>
                        <td className="px-6 py-4 font-bold text-text-main print-text-dark">
                          <p className="truncate max-w-[150px]">{ret.provider_name}</p>
                          <span className="text-[9px] font-mono text-muted-foreground">{ret.provider_rif}</span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-xs print-text-dark">
                          {ret.invoice_number}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                            ret.type === 'IVA'
                              ? 'bg-purple-100 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300'
                              : 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300'
                          }`}>
                            {ret.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-xs">
                          ${(ret.base_taxable || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-center font-mono font-bold text-xs">
                          {ret.retention_percentage}%
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-650 dark:text-emerald-450">
                          ${ret.retention_amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-black text-primary">
                          Bs. {amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE EXPORTACIÓN UNIFICADO FACTURAS */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        dataType="invoices"
        data={filteredInvoices}
        providersList={providers}
      />
    </div>
  );
};
