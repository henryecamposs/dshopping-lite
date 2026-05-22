// dShopping Lite - Vista de Gestión de Facturas
// Coordinación de la lista y el formulario de facturas con auto-cálculos financieros

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useExchangeStore } from '../store/exchangeStore';
import { useInvoiceStore } from '../store/invoiceStore';
import { InvoiceForm } from '../components/InvoiceForm';
import { ExportModal } from '../components/ExportModal';
import { PrintPreviewModal } from '../components/PrintPreviewModal';
import { RetentionForm } from '../components/retentions/RetentionForm';
import { PaymentForm } from '../components/payments/PaymentForm';
import { PrintRetentionModal } from '../components/retentions/PrintRetentionModal';
import { Plus, Receipt, Search, FileText, CheckCircle, Trash2, Calendar, Printer, Edit, MoreVertical, Download, ShieldCheck, Wallet, Landmark } from 'lucide-react';
import { Invoice, InvoiceRetention } from '../types';
import Swal from 'sweetalert2';


export const Invoices: React.FC = () => {
  const { company } = useAuthStore();
  const { currentRate, formatCurrencyUSD, formatCurrencyLocal } = useExchangeStore();
  const { invoices, providers, fetchInvoices, fetchProviders, updateInvoiceStatus, deleteInvoice, loading } = useInvoiceStore();

  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [selectedInvoiceForPreview, setSelectedInvoiceForPreview] = useState<Invoice | null>(null);
  
  // Nuevos estados para retenciones y pagos
  const [retentionInvoice, setRetentionInvoice] = useState<Invoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [retentionToPrint, setRetentionToPrint] = useState<InvoiceRetention | null>(null);
  const [isPrintRetentionOpen, setIsPrintRetentionOpen] = useState<boolean>(false);


  useEffect(() => {
    if (company?.id) {
      fetchInvoices(company.id);
      fetchProviders(company.id);
    }
  }, [company?.id, fetchInvoices, fetchProviders]);

  const handleMarkAsPaid = async (id: string, currentStatus: 'pending' | 'paid') => {
    const nextStatus = currentStatus === 'pending' ? 'paid' : 'pending';
    const isDark = document.documentElement.classList.contains('dark');
    
    Swal.fire({
      title: nextStatus === 'paid' ? '¿Marcar como Pagada?' : '¿Marcar como Pendiente?',
      text: nextStatus === 'paid' 
        ? 'Esta factura se marcará como pagada y se descontará del balance de deudas pendientes.'
        : 'Esta factura volverá a estar en estado pendiente de pago.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#8b5cf6', // Violeta
      cancelButtonColor: '#4b5563', // Gris
      background: isDark ? '#1e1b4b' : '#ffffff',
      color: isDark ? '#f3f4f6' : '#1f2937',
    }).then(async (result) => {
      if (result.isConfirmed) {
        const success = await updateInvoiceStatus(id, nextStatus);
        if (success) {
          Swal.fire({
            title: '¡Actualizado!',
            text: 'El estado de la factura ha sido modificado.',
            icon: 'success',
            confirmButtonColor: '#8b5cf6',
            background: isDark ? '#1e1b4b' : '#ffffff',
            color: isDark ? '#f3f4f6' : '#1f2937',
            timer: 2000,
            showConfirmButton: false
          });
        }
      }
    });
  };

  const handleDelete = async (id: string) => {
    const isDark = document.documentElement.classList.contains('dark');
    
    Swal.fire({
      title: '¿Eliminar Factura?',
      text: '¿Está seguro de que desea ELIMINAR esta factura? Esta operación no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444', // Rojo destructivo
      cancelButtonColor: '#4b5563', // Gris
      background: isDark ? '#1e1b4b' : '#ffffff',
      color: isDark ? '#f3f4f6' : '#1f2937',
    }).then(async (result) => {
      if (result.isConfirmed) {
        const success = await deleteInvoice(id);
        if (success) {
          Swal.fire({
            title: '¡Eliminada!',
            text: 'La factura ha sido eliminada del sistema.',
            icon: 'success',
            confirmButtonColor: '#8b5cf6',
            background: isDark ? '#1e1b4b' : '#ffffff',
            color: isDark ? '#f3f4f6' : '#1f2937',
            timer: 2000,
            showConfirmButton: false
          });
        }
      }
    });
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.control_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.provider_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isFormOpen = isCreating || invoiceToEdit !== null;

  return (
    <div className="space-y-6">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight">Registro de Facturas</h2>
          <p className="text-slate-400 text-sm">Controle sus facturas recibidas y los plazos de vencimiento fiscal.</p>
        </div>
        {!isFormOpen && (
          <div className="flex gap-3">
            <button
              onClick={() => setIsExportOpen(true)}
              className="btn-secondary text-xs flex items-center gap-2"
            >
              <Download size={16} />
              Exportar Datos
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className="btn-primary"
            >
              <Plus size={18} />
              Cargar Factura
            </button>
          </div>
        )}
      </div>

      {/* RENDERIZADO CONDICIONAL DE FORMULARIO U LISTA */}
      {isFormOpen ? (
        <InvoiceForm
          invoiceToEdit={invoiceToEdit}
          onSuccess={() => {
            setIsCreating(false);
            setInvoiceToEdit(null);
            if (company?.id) fetchInvoices(company.id);
          }}
          onCancel={() => {
            setIsCreating(false);
            setInvoiceToEdit(null);
          }}
        />
      ) : (
        <div className="glass-card rounded-3xl p-6">
          {/* BUSCADOR */}
          <div className="relative flex items-center mb-6">
            <span className="absolute left-4 text-slate-500">
              <Search size={18} />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-premium w-full pl-11 text-sm"
              placeholder="Buscar por Proveedor, Nro. Factura o Control..."
            />
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="p-12 text-center bg-muted/20 border border-border-main rounded-2xl">
              <Receipt className="mx-auto text-muted-foreground mb-2" size={40} />
              <p className="text-muted-foreground text-sm">No se encontraron registros de facturas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-text-main/85 dark:text-slate-350">
                <thead className="text-xs uppercase bg-muted/30 text-muted-foreground border-b border-border-main">
                  <tr>
                    <th className="px-6 py-4 font-bold">Proveedor</th>
                    <th className="px-6 py-4 font-bold">Factura</th>
                    <th className="px-6 py-4 font-bold">Emisión / Crédito</th>
                    <th className="px-6 py-4 font-bold">Vencimiento</th>
                    <th className="px-6 py-4 font-bold text-right">Importe ($)</th>
                    <th className="px-6 py-4 font-bold text-right">Importe (Bs.)</th>
                    <th className="px-6 py-4 font-bold text-center">Estado</th>
                    <th className="px-6 py-4 font-bold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main bg-muted/10">
                  {filteredInvoices.map((inv) => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isExpired = inv.due_date < todayStr && inv.status === 'pending';
                    const activeRate = currentRate?.rate_value || inv.exchange_rate_at_invoice;
                    const localVal = inv.total_invoice * activeRate;

                    return (
                      <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-semibold text-text-main">
                          <p className="truncate max-w-[200px]">{inv.provider_name}</p>
                          <span className="text-[10px] font-mono text-primary">Control: {inv.control_number}</span>
                        </td>
                        <td className="px-6 py-4 font-mono font-medium">
                          {inv.invoice_number}
                          {inv.invoice_retentions && inv.invoice_retentions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 font-sans">
                              {inv.invoice_retentions.map(r => (
                                <span key={r.id} className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded ${
                                  r.type === 'IVA'
                                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/40'
                                    : 'bg-purple-50 border border-purple-200 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/40'
                                }`}>
                                  {r.type} Ret
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-mono text-xs">{inv.invoice_date}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold">{inv.credit_days} días de crédito</p>
                        </td>
                        <td className="px-6 py-4 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              isExpired 
                                ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20' 
                                : 'bg-muted/50 text-muted-foreground'
                            }`}>
                              {inv.due_date}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-right text-primary">
                          {formatCurrencyUSD(inv.total_invoice)}
                          {inv.net_payable !== undefined && inv.net_payable !== inv.total_invoice && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold" title="Neto a pagar descontando retenciones">
                              Neto: {formatCurrencyUSD(inv.net_payable)}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-right text-emerald-600 dark:text-emerald-400">
                          {/* MONTO CAMBIARIO REGISTRADO EN LA FACTURA */}
                          {formatCurrencyLocal(localVal)}
                          <p className="text-[9px] text-muted-foreground font-semibold">Tasa: {activeRate.toFixed(2)}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              if (inv.status === 'pending') {
                                setPaymentInvoice(inv);
                              } else {
                                handleMarkAsPaid(inv.id, inv.status);
                              }
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase cursor-pointer transition-all border ${
                              inv.status === 'paid'
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                                : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                            }`}
                          >
                            {inv.status === 'paid' ? 'Pagado' : 'Pendiente'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center relative">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(activeDropdownId === inv.id ? null : inv.id);
                              }}
                              className="p-2 text-muted-foreground hover:text-text-main hover:bg-muted/30 rounded-xl transition-all cursor-pointer inline-flex"
                              title="Acciones"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {activeDropdownId === inv.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setActiveDropdownId(null)}
                                />
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 mt-1 w-32 bg-white dark:bg-slate-900 border border-border-main dark:border-indigo-950 rounded-xl shadow-xl z-20 py-1 font-semibold text-xs text-left animate-in fade-in slide-in-from-top-1 duration-100">
                                  <button
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      setSelectedInvoiceForPreview(inv);
                                      setIsPreviewOpen(true);
                                    }}
                                    className="w-full px-3 py-2 hover:bg-primary/10 text-primary dark:text-indigo-400 hover:dark:bg-indigo-950/40 flex items-center gap-2 transition-colors cursor-pointer text-left font-semibold"
                                  >
                                    <Printer size={14} />
                                    Imprimir
                                  </button>
                                  
                                  {inv.status === 'pending' && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setActiveDropdownId(null);
                                          setPaymentInvoice(inv);
                                        }}
                                        className="w-full px-3 py-2 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:dark:bg-emerald-950/40 flex items-center gap-2 transition-colors cursor-pointer text-left font-semibold"
                                      >
                                        <Wallet size={14} />
                                        Registrar Pago
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveDropdownId(null);
                                          setRetentionInvoice(inv);
                                        }}
                                        className="w-full px-3 py-2 hover:bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 hover:dark:bg-indigo-950/40 flex items-center gap-2 transition-colors cursor-pointer text-left font-semibold"
                                      >
                                        <ShieldCheck size={14} />
                                        Retención
                                      </button>
                                    </>
                                  )}

                                  {inv.invoice_retentions && inv.invoice_retentions.map(r => (
                                    <button
                                      key={r.id}
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        setRetentionToPrint(r);
                                        setIsPrintRetentionOpen(true);
                                      }}
                                      className="w-full px-3 py-2 hover:bg-purple-500/10 text-purple-650 dark:text-purple-400 hover:dark:bg-purple-950/40 flex items-center gap-2 transition-colors cursor-pointer text-left font-semibold"
                                    >
                                      <Landmark size={14} />
                                      Imp. Ret. {r.type}
                                    </button>
                                  ))}

                                  <button
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      setInvoiceToEdit(inv);
                                    }}
                                    className="w-full px-3 py-2 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:dark:bg-amber-950/40 flex items-center gap-2 transition-colors cursor-pointer text-left font-semibold"
                                  >
                                    <Edit size={14} />
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      handleDelete(inv.id);
                                    }}
                                    className="w-full px-3 py-2 hover:bg-rose-500/10 text-rose-600 dark:text-rose-450 hover:dark:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer text-left font-semibold"
                                  >
                                    <Trash2 size={14} />
                                    Eliminar
                                  </button>
                                </div>
                              </>
                            )}
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

      {/* MODALS DE EXPORTACIÓN E IMPRESIÓN */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        dataType="invoices"
        data={filteredInvoices}
        providersList={providers}
      />
      
      <PrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setSelectedInvoiceForPreview(null);
        }}
        invoice={selectedInvoiceForPreview}
        providers={providers}
      />

      {/* MODALES DE RETENCIONES Y PAGOS */}
      {retentionInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <RetentionForm
            companyId={company?.id || ''}
            invoiceId={retentionInvoice.id}
            invoiceData={retentionInvoice}
            onSuccess={() => {
              setRetentionInvoice(null);
              if (company?.id) fetchInvoices(company.id);
            }}
            onCancel={() => setRetentionInvoice(null)}
          />
        </div>
      )}

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

      {isPrintRetentionOpen && retentionToPrint && (
        <PrintRetentionModal
          isOpen={isPrintRetentionOpen}
          onClose={() => {
            setIsPrintRetentionOpen(false);
            setRetentionToPrint(null);
          }}
          retention={retentionToPrint}
          invoice={invoices.find(i => i.id === retentionToPrint.invoice_id) || null}
          provider={providers.find(p => p.id === (invoices.find(i => i.id === retentionToPrint.invoice_id)?.provider_id)) || null}
        />
      )}
    </div>
  );
};
