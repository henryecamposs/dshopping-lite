// dShopping Lite - Centro de Reportes y Consultas Avanzadas
// Filtros por proveedores, fechas e impresión nativa ejecutiva con CSS @media print

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useExchangeStore } from '../store/exchangeStore';
import { useInvoiceStore } from '../store/invoiceStore';
import { 
  FileSpreadsheet, 
  Printer, 
  Search, 
  Filter, 
  RefreshCw, 
  ChevronDown, 
  CalendarClock,
  TrendingUp,
  Receipt
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { company } = useAuthStore();
  const { currentRate, formatCurrencyUSD, formatCurrencyLocal, convertToLocalCurrency } = useExchangeStore();
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

  useEffect(() => {
    if (company?.id) {
      fetchInvoices(company.id);
      fetchProviders(company.id);
    }
  }, [company?.id, fetchInvoices, fetchProviders]);

  const filteredData = getFilteredInvoices();

  // =========================================================================
  // 1. CÁLCULO DE TOTALES PARA ENCABEZADO DE REPORTE (DINÁMICO)
  // =========================================================================
  const totalUSD = filteredData.reduce((sum, inv) => sum + inv.total_invoice, 0);
  const totalLocalBs = convertToLocalCurrency(totalUSD);

  const pendingUSD = filteredData
    .filter(inv => inv.status === 'pending')
    .reduce((sum, inv) => sum + inv.total_invoice, 0);
  const pendingBs = convertToLocalCurrency(pendingUSD);

  // =========================================================================
  // 2. EXPORTACIÓN A EXCEL EN FORMATO LIMPIO CSV (Requisito Excel)
  // =========================================================================
  const exportToExcel = () => {
    if (filteredData.length === 0) {
      alert('No hay datos filtrados para exportar.');
      return;
    }

    // Encabezados del CSV
    const headers = [
      'Proveedor',
      'RIF Proveedor',
      'Numero Factura',
      'Numero Control',
      'Fecha Emision',
      'Dias Credito',
      'Fecha Vencimiento',
      'Base Imponible (USD)',
      'Base Exenta (USD)',
      'IVA %',
      'IVA Cantidad (USD)',
      'Total Factura (USD)',
      'Tasa de Cambio Registrada',
      'Total Factura (Bs.)',
      'Estado'
    ];

    // Mapear registros
    const rows = filteredData.map((inv) => [
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

    // Unir cabecera y filas
    const csvContent = 
      'data:text/csv;charset=utf-8,\uFEFF' + // UTF-8 BOM para soporte de acentos en Excel
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    
    const todayStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `dShopping_Reporte_${company?.name.replace(/\s+/g, '_')}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================================
  // 3. EXPORTACIÓN A PDF Y SISTEMA DE IMPRESIÓN NATIVA
  // =========================================================================
  const handlePrint = () => {
    /* 
      Utiliza la API nativa de impresión del navegador.
      El archivo src/index.css contiene los estilos CSS @media print
      encargados de reestructurar la tabla y ocultar menús laterales
      de forma totalmente transparente para el usuario.
    */
    window.print();
  };

  return (
    <div className="space-y-6 print-container">
      
      {/* CABECERA EJECUTIVA PARA EL PDF IMPRESO (Oculta en pantalla) */}
      <div className="print-header">
        <h1>dShopping Lite — Reporte Financiero de Compras</h1>
        <p><strong>Empresa:</strong> {company?.name} | RIF: {company?.rif}</p>
        <p><strong>Fecha de Emisión del Reporte:</strong> {new Date().toLocaleDateString()} | <strong>Tasa Cambiaria Hoy:</strong> {currentRate?.rate_value.toFixed(2)} Bs/$</p>
      </div>

      {/* CABECERA (Pantalla) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight">Centro de Reportes y Consultas</h2>
          <p className="text-muted-foreground text-sm">Gere e imprima balances financieros detallados de sus cuentas.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportToExcel}
            className="btn-secondary text-xs"
          >
            <FileSpreadsheet size={16} className="text-emerald-400" />
            Exportar Excel (CSV)
          </button>
          <button
            onClick={handlePrint}
            className="btn-primary text-xs"
          >
            <Printer size={16} />
            Imprimir Reporte (PDF)
          </button>
        </div>
      </div>

      {/* PANEL DE FILTROS AVANZADOS (Pantalla) */}
      <div className="glass-card rounded-3xl p-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end no-print">
        {/* Proveedor */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Proveedor</label>
          <select
            value={filters.providerId}
            onChange={(e) => setFilter('providerId', e.target.value)}
            className="input-premium w-full text-xs"
          >
            <option value="all">Todos los Proveedores</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Estado */}
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

        {/* Rango de Vencimiento */}
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
          </select>
        </div>

        {/* Botón de Reset */}
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
            className="p-2.5 bg-muted/20 hover:bg-muted/35 text-muted-foreground hover:text-text-main rounded-xl border border-border-main transition-colors"
            title="Restablecer Filtros"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* RESUMEN DE TOTALES FILTRADOS (Impresión y Pantalla) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-3xl p-5 print-text-dark print:border-slate-300">
        <div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Facturas Filtradas</p>
          <p className="text-lg font-bold text-text-main print-text-dark font-mono">{filteredData.length} registros</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Seleccionado ($)</p>
          <p className="text-lg font-bold text-primary print-text-dark font-mono">{formatCurrencyUSD(totalUSD)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Equivalente (Bs.)</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 print-text-dark font-mono">{formatCurrencyLocal(totalLocalBs)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Pendiente de Pago</p>
          <p className="text-lg font-bold text-amber-650 dark:text-amber-500 print-text-dark font-mono">{formatCurrencyUSD(pendingUSD)}</p>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE REPORTES */}
      <div className="glass-card rounded-3xl p-6 print:border-none print:shadow-none">
        {filteredData.length === 0 ? (
          <div className="p-12 text-center bg-muted/20 border border-border-main rounded-2xl">
            <Receipt className="mx-auto text-muted-foreground mb-2" size={40} />
            <p className="text-muted-foreground text-sm">No hay registros financieros que cumplan con los filtros de consulta.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-text-main/80 dark:text-slate-350">
              <thead className="text-xs uppercase bg-muted/30 text-muted-foreground border-b border-border-main">
                <tr>
                  <th className="px-6 py-4 font-bold">Proveedor / RIF</th>
                  <th className="px-6 py-4 font-bold">Nro. Factura</th>
                  <th className="px-6 py-4 font-bold">Nro. Control</th>
                  <th className="px-6 py-4 font-bold">Emisión</th>
                  <th className="px-6 py-4 font-bold">Vencimiento</th>
                  <th className="px-6 py-4 font-bold text-right">Importe ($)</th>
                  <th className="px-6 py-4 font-bold text-right">Monto Bs. (Factura)</th>
                  <th className="px-6 py-4 font-bold text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main bg-muted/10 dark:bg-muted/5">
                {filteredData.map((inv) => {
                  const rif = providers.find(p => p.id === inv.provider_id)?.rif || 'S/N';
                  const localVal = inv.total_invoice * inv.exchange_rate_at_invoice;
                  return (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-text-main print-text-dark">
                        <p className="truncate max-w-[200px]">{inv.provider_name}</p>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">{rif}</span>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium print-text-dark">{inv.invoice_number}</td>
                      <td className="px-6 py-4 font-mono print-text-dark">{inv.control_number}</td>
                      <td className="px-6 py-4 font-mono print-text-dark">{inv.invoice_date}</td>
                      <td className="px-6 py-4 font-mono print-text-dark">{inv.due_date}</td>
                      <td className="px-6 py-4 font-mono font-bold text-right text-primary print-text-dark print-text-right">
                        {formatCurrencyUSD(inv.total_invoice)}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-right text-emerald-650 dark:text-emerald-400 print-text-dark print-text-right">
                        {/* CÁLCULO MONETARIO BASADO EN LA TASA DEL COMPROMISO */}
                        {formatCurrencyLocal(localVal)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
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
    </div>
  );
};
